import AccessGlobalService from '../../entities/app'
import { Elysia, } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import type { IEventTemplate, IPostTemplateDesignReq, IDeleteTemplateDesignReq, IPatchTemplateDesignReq } from '../../entities/eventTemplate'
const router = new Elysia()
router.use(bearer())
    .post('/event', async function ({ request, bearer }) {
        const { AuthService, EventService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const event = await request.json() as IEventTemplate
        const result = await EventService.createNewEvent(user.uid, event)
        return result
    })
    .patch('/event', async function ({ request, bearer }) {
        const { AuthService, EventService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const event = await request.json() as IEventTemplate
        // const result = await EventService.createNewEvent(user.uid, event)
        // return result
    })
    .get('/event/:id', async function ({ params }) {
        const { EventService } = AccessGlobalService.locals
        const { id } = params
        const event = await EventService.getEvent(id)
        return event
    })
    .delete('/event/:id', async function ({ params, bearer }) {
        const { EventService, AuthService } = AccessGlobalService.locals
        const { id } = params
        const user = await AuthService.verifyIdToken(bearer)
        const event = await EventService.deleteEvent(user.uid, id)
        return event
    })
    .get('/event/list', async function ({ query }) {
        const { EventService } = AccessGlobalService.locals
        const eventQuery = query as any
        const eventList = await EventService.getEventRecords(eventQuery)
        return eventList
    })
    .get('/event/template', async function ({ bearer }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const result = await EventTemplateService.getTemplate(user.uid)
        return result
    })
    .post('/event/template', async function ({ request, bearer }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const eventTemplate = await request.json() as any
        const result = await EventTemplateService.addEventTemplate(user.uid, eventTemplate)
        return result
    })
    .patch('/event/template', async function ({ request, bearer }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const designIds: string[] = await request.json() as string[]
        const result = await EventTemplateService.patchTemplate(user.uid, designIds)
        return result
    })
    .delete('/event/template/:id', async function ({ bearer, params }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const { id } = params
        const count = await EventTemplateService.deleteTemplate(user.uid, id)
        return count
    })
    .post('/event/template/design', async function ({ request, bearer }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const eventTemplateDesign: IPostTemplateDesignReq = await request.json() as any
        const desginId = await EventTemplateService.postDesign(user.uid, eventTemplateDesign)
        return desginId
    })
    .delete('/event/template/design/:id', async function ({ bearer, params }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const { id } = params
        const lastmod = await EventTemplateService.deleteTemplateDesign(user.uid, id)
        return lastmod
    })
    .patch('/event/template/design', async function ({ request, bearer }) {
        const { EventTemplateService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const patchRequest: IPatchTemplateDesignReq = await request.json() as any
        const lastmod = await EventTemplateService.patchTemplateDesign(user.uid, patchRequest)
        return lastmod
    })
export default router