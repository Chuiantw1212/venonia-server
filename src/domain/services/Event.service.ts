import type { IEventTemplate, ITemplateDesign, } from '../../entities/eventTemplate';
import type { IEvent, IEventQuery, } from '../../entities/event';
import EventModel from '../Event.model'
import EventActorModel from '../EventActor.model'
import EventDesignModel from '../EventDesign.model';
import OrganizationModel from '../Organization.model';
import NlpAdapter from '../../adapters/nlp.out';

interface Idependency {
    eventModel: EventModel;
    eventDesignModel: EventDesignModel;
    eventActorModel: EventActorModel;
    organizationModel: OrganizationModel
    nlpAdapter: NlpAdapter
}

export default class EventService {
    private eventModel: EventModel
    private eventDesignModel: EventDesignModel
    private organizationModel: OrganizationModel
    private nlpAdapter: NlpAdapter

    constructor(dependency: Idependency) {
        const {
            eventModel,
            eventDesignModel,
            eventActorModel,
            organizationModel,
            nlpAdapter,
        } = dependency
        this.eventModel = eventModel
        this.eventDesignModel = eventDesignModel
        this.organizationModel = organizationModel
        this.nlpAdapter = nlpAdapter
    }

    /**
     * 新增活動
     * @param uid 
     * @param eventTemplate 
     * @returns 
     */
    async createNewEvent(uid: string, eventTemplate: IEventTemplate): Promise<IEvent> {
        if (!eventTemplate.designs?.length) {
            throw 'designs不存在'
        }
        // 建立sql與noSql的關聯，修改時，用collection資料覆蓋SQL
        const templateDesigns: ITemplateDesign[] = eventTemplate.designs as ITemplateDesign[]
        const designsWithFormField = templateDesigns.filter(design => {
            return design.formField
        })
        const event: IEvent = {
            isPublic: false, // 預設非公開
        }
        // 更新EventMaster
        designsWithFormField.forEach(async (design: ITemplateDesign) => {
            const eventPatch = await this.extractFormField(uid, design)
            if (eventPatch) {
                Object.assign(event, eventPatch)
            }
        })
        // 儲存事件Master
        const newEvent = await this.eventModel.createEvent(uid, event)
        if (newEvent.id) {
            eventTemplate.id = newEvent.id
            this.updateEventKeywordsById(uid, newEvent.id)
        }
        // 拷貝designs details
        const designsTemp = eventTemplate.designs
        delete eventTemplate.designs
        // 儲存欄位designs details
        const designDocPromises = designsTemp.map((design) => {
            delete design.id // 重要，不然會污染到模板資料
            return this.eventDesignModel.createDesign(uid, design)
        })
        const designDocs: ITemplateDesign[] = await Promise.all(designDocPromises) as ITemplateDesign[]
        const designIds = designDocs.map(doc => doc.id ?? '')
        // 更新事件Master
        const dateDesign = designDocs.find(design => {
            return design.formField === 'date'
        })
        if (dateDesign) {
            await this.eventModel.mergeEventById(uid, String(newEvent.id), {
                dateDesignId: dateDesign.id,
                designIds,
            })
        }
        return newEvent // 回傳完整Event才有機會，未來打開新事件時不用重新get
    }

    async patchEventForm(uid: string, eventDesign: ITemplateDesign): Promise<number> {
        if (!eventDesign.id || !eventDesign.eventId || !eventDesign.mutable) {
            throw 'id或是eventId不存在'
        }
        // 更新EventDesigns
        const count = await this.eventDesignModel.patchEventDesignById(uid, eventDesign.id, eventDesign)
        // 更新EventMaster
        const eventPatch = await this.extractFormField(uid, eventDesign)
        if (eventPatch) {
            await this.eventModel.mergeEventById(uid, eventDesign.eventId, eventPatch)
        }
        return count
    }

    private async extractFormField(uid: string, eventDesign: ITemplateDesign) {
        if (!eventDesign.mutable || !eventDesign.eventId) {
            return
        }
        const eventPatch: IEvent = {}
        switch (eventDesign.formField) {
            case 'location': {
                eventPatch.locationId = eventDesign.mutable.placeId
                eventPatch.locationAddressRegion = eventDesign.mutable.placeAddressRegion
                break;
            }
            case 'banner': {
                eventPatch.banner = eventDesign.mutable.value
                break;
            }
            case 'description': {
                eventPatch.description = eventDesign.mutable.value
                break;
            }
            case 'name': {
                eventPatch.name = eventDesign.mutable.value
                break;
            }
            case 'date': {
                const startDate = eventDesign.mutable.value[0]
                const endDate = eventDesign.mutable.value[1]
                eventPatch.startDate = startDate
                eventPatch.endDate = endDate
                const startHour = new Date(startDate).getHours()
                if (6 <= startHour && startHour < 12) {
                    eventPatch.startHour = 'morning'
                }
                if (12 <= startHour && startHour < 18) {
                    eventPatch.startHour = 'afternoon'
                }
                if (18 <= startHour && startHour < 24) {
                    eventPatch.startHour = 'evening'
                }
                break;
            }
            case 'organizer': {
                if (eventDesign.mutable?.organizationId) {
                    const organizerLogo = await this.organizationModel.getLogoUrl(eventDesign.mutable.organizationId)
                    Object.assign(eventPatch, {
                        organizationId: eventDesign.mutable.organizationId,
                        organizerName: eventDesign.mutable.organizationName,
                        organizerLogo,
                    })
                }
                break;
            }
            default: {
                return {}
            }
        }
        // 一但觸發更新關鍵字列表
        if (['name', 'description'].includes(eventDesign.formField)) {
            this.updateEventKeywordsById(uid, eventDesign.eventId)
        }
        return eventPatch
    }

    /**
     * 更新event.keywords
     * @param uid 
     * @param eventId 
     */
    private async updateEventKeywordsById(uid: string, eventId: string,) {
        const event = await this.eventModel.getEventById(eventId)
        if (!event) return

        const description = event.description
        const name = event.name
        const fullText = `${name}。${description}`
        const newKeywords = this.nlpAdapter.extractKeywords(fullText)
        this.eventModel.mergeEventById(uid, eventId, {
            keywords: newKeywords
        })
    }

    /**
     * 月曆日期拖拽以及開放表單使用
     * @param uid 
     * @param updateEventReq 
     * @returns 
     */
    async patchEventCalendar(uid: string, updateEventReq: IEvent): Promise<number> {
        if (!updateEventReq.id) {
            throw 'event.id不存在'
        }
        const { dateDesignId, startDate, endDate, isPublic } = updateEventReq
        if (dateDesignId && startDate && endDate) {
            const originEventDesign: ITemplateDesign = await this.eventDesignModel.getEventDesignById(dateDesignId)
            if (originEventDesign.mutable) {
                originEventDesign.mutable.value = [startDate, endDate]
            }
            await this.eventDesignModel.patchEventDesignById(uid, dateDesignId, originEventDesign)
        }
        // SQL
        const newEvent: IEvent = {}
        if (isPublic !== null) { // false !== null
            newEvent.isPublic = isPublic
        }
        if (startDate) {
            newEvent.startDate = startDate
        }
        if (endDate) {
            newEvent.endDate = endDate
        }
        const count = await this.eventModel.mergeEventById(uid, updateEventReq.id, newEvent)
        return count
    }

    async getEvent(id: string, uid: string,): Promise<IEventTemplate | 0> {
        const eventTemplate: IEventTemplate | 0 = await this.eventModel.getEventById(id)
        if (eventTemplate) {
            const designIds = eventTemplate.designIds || []
            // 取得details並回傳
            const designPromises = await designIds.map((designId: string) => {
                return this.eventDesignModel.getEventDesignById(designId)
            })
            const eventTemplateDesigns = await Promise.all(designPromises) as ITemplateDesign[]
            const isAllDetailMissing = eventTemplateDesigns.every(value => !value)
            if (isAllDetailMissing) {
                if (uid) {
                    console.error('event.designs皆為0', id)
                    this.eventModel.deleteByEventId(uid, id)
                }
                return 0
            } else {
                eventTemplate.designs = eventTemplateDesigns
                delete eventTemplate.designIds
                return eventTemplate
            }
        }
        return 0
    }

    async deleteEvent(uid: string, id: string): Promise<number> {
        const event: IEventTemplate | 0 = await this.eventModel.getEventById(id)
        if (!event) {
            return 0
        }
        const designIds = event.designIds ?? []
        if (!designIds.length) {
            console.trace('資料有誤, event.designIds不存在', id)
            // return 0
        }
        const masterPromise = this.eventModel.deleteByEventId(uid, id)
        const detailPromises = designIds?.map(designId => {
            return this.eventDesignModel.deleteDesignById(uid, designId)
        })
        const ones = await Promise.all([masterPromise, ...detailPromises])
        const isSuccess = ones.every((value: number) => value == 1)
        if (isSuccess) {
            return 1
        } else {
            // throw `刪除途中出錯, ${[id, id, ...designIds]}`
            return 500
        }
    }

    async queryEventList(query: IEventQuery): Promise<IEvent[]> {
        /**
         * 處理
         */
        if (query.keywords) {
            const keywords = this.nlpAdapter.cutForSearch(query.keywords as string)
            query.keywords = keywords
        }
        const events = await this.eventModel.queryEventList(query) as IEvent[]
        return events
    }
}