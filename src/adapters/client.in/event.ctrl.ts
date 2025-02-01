import AccessGlobalService from '../../entities/app'
import { Elysia, } from 'elysia'
import { bearer } from '@elysiajs/bearer'
const router = new Elysia()
router.use(bearer())
    .post('/event', async function ({ request, bearer }) {
        const { AuthService, EventService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const event = await request.json() as any
        const result = await EventService.createNewEvent(user.uid, event)

        // const result = {
        //     // ...countiesAndTownMap,
        //     // ...selectOptionsMap,
        // }
        // return result
    })
    .get('/event/template', async function ({ request, bearer }) {
        const { EventService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const eventTemplate = await EventService.getTemplate(user.uid)
        return eventTemplate
    })
    .put('/event/template', async function ({ request, bearer }) {
        const { EventService, AuthService } = AccessGlobalService.locals
        const user = await AuthService.verifyIdToken(bearer)
        const eventTemplate = await request.json() as any
        const result = await EventService.putTemplate(user.uid, eventTemplate)
        return result
    })
export default router