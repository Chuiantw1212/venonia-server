import FirebaseAdapter from "../../adapters/firebase.out.js"
export default class VerifyIdTokenService {
    protected adapter: typeof FirebaseAdapter = null as any
    constructor(firebase: typeof FirebaseAdapter) {
        this.adapter = firebase
    }
    verifyIdToken(idToken: string) {
        const decodedIdToken = this.adapter.verifyIdToken(idToken)
        return decodedIdToken
    }
}