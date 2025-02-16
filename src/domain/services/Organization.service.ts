import OrganizationModel from '../Organization.model'
import OrganizationMemberModel from '../OrganizationMember.model';
import type { IOrganization, IOrganizationMember } from '../../entities/organization';

interface Idependency {
    organizationModel: OrganizationModel;
    organizationMemberModel: OrganizationMemberModel
}

export default class OrganizationService {
    protected organizationModel: OrganizationModel = null as any
    protected organizationMemberModel: OrganizationMemberModel = null as any

    constructor(dependency: Idependency) {
        const {
            organizationModel,
            organizationMemberModel,
        } = dependency
        this.organizationModel = organizationModel
        this.organizationMemberModel = organizationMemberModel
    }

    async storeLogo(id: string, logo: any) {
        return await this.organizationModel.storeLogo(id, logo)
    }

    /**
     * 新增組織
     * @param uid UserUid
     * @param organization 
     */
    async newItem(uid: string, organization: IOrganization) {
        return await this.organizationModel.createOrganization(uid, organization) as IOrganization
    }

    /**
     * 取得組織
     */
    async getItem(id: string) {
        const organizationList = await this.organizationModel.getOrganizationById(id) as IOrganization
        return organizationList
    }

    /**
     * 更新組織
     */
    async mergeUniqueDoc(uid: string, id: string, organization: IOrganization) {
        return await this.organizationModel.mergeOrganizationById(uid, organization.id, organization)
    }

    /**
     * 取得列表
     * @returns 
     */
    async getOrganizationList() {
        const list: IOrganization[] = await this.organizationModel.getOrganizationList()
        return list
    }

    /**
     * 取得成員列表
     * @param uid 使用者uid
     * @param organizationId 企業文件Id
     * @returns 
     */
    async getMemberList(uid: string, organizationId: string): Promise<IOrganizationMember[]> {
        const list: IOrganizationMember[] = await this.organizationMemberModel.getMemberList(uid, organizationId) as IOrganizationMember[]
        return list
    }

    /**
     * 刪除組織
     * @param id 
     * @returns 
     */
    async deleteItem(uid: string, id: string) {
        return await this.organizationModel.deleteItem(uid, id)
    }
}