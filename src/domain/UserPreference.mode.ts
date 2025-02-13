import Firestore from '../adapters/Firestore.adapter'
import { IUserPreference } from '../entities/user'
import type { IModelPorts } from '../ports/out.model'

export default class UserPreferenceModel extends Firestore {
    constructor(data: IModelPorts) {
        super(data)
    }

    async setPreference(uid: string, preference: IUserPreference): Promise<number> {
        const count = await super.setItemsByQuery([['uid', '==', uid]], preference, {
            merge: true,
            count: {
                absolute: 1
            }
        })
        return count
    }

    /**
     * 取得用戶偏好
     * @param uid 
     * @returns 
     */
    async getPreference(uid: string): Promise<IUserPreference> {
        const users: IUserPreference[] = await super.getItemsByQuery([['uid', '==', uid]], {
            count: {
                range: [0, 1]
            }
        }) as IUserPreference[]
        return users[0]
    }
}