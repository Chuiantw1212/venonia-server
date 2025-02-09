const time = new Date().getTime()
import { Elysia } from 'elysia'
import { node } from '@elysiajs/node'
import { cors } from '@elysiajs/cors'
import path from 'path'
// // entities
import AccessGlobalService from './entities/app'
// adapters
import firebase from './adapters/firebase.out'
import googleCloud from './adapters/googleCloud.out'
import googleCalendar from './adapters/googleCalendar.out'
// models
import PlaceModel from './domain/Place.model'
import SelectModel from './domain/Select.model';
import EventModel from './domain/Event.model'
import EventDesignModel from './domain/EventDesign.model'
import EventSchemaModel from './domain/EventSchema.model'
import EventActorModel from './domain/EventActor.model'
import EventTemplateModel from './domain/EventTemplate.model'
import EventTemplateDesignModel from './domain/EventTemplateDesign.model'
import OrganizationModel from './domain/Organization.model'
import OrganizationMemberModel from './domain/OrganizationMember.model'
// services
import MetaService from './domain/services/Meta.service';
import EventService from './domain/services/Event.service';
import EventTemplateService from './domain/services/EventTemplate.service'
import OrganizationService from './domain/services/Organization.service'
import AuthService from './domain/services/Auth.service'
import PlaceService from './domain/services/Place.service'
// services.others
import { ILocals } from './entities/app';
// controllers
import rootController from './adapters/client.in/root.ctrl'
import eventController from './adapters/client.in/event.ctrl'
import eventTemplateController from './adapters/client.in/eventTemplate.ctrl'
import organizationController from './adapters/client.in/organization.ctrl'
import placeController from './adapters/client.in/place.ctrl'

(async () => {
    const app = new Elysia({ adapter: node() })
    /**
     * Adapters
     */
    // Load firebase
    let FIREBASE_SERVICE_ACCOUNT_KEY_JSON = null
    try {
        FIREBASE_SERVICE_ACCOUNT_KEY_JSON = await googleCloud.accessSecret('FIREBASE_SERVICE_ACCOUNT_KEY_JSON')
    } catch (error: any) {
        console.trace('FIREBASE_SERVICE_ACCOUNT_KEY_JSON:', error.message)
        const keyPath = path.resolve(__dirname, '../FIREBASE_SERVICE_ACCOUNT_KEY_JSON.json')
        FIREBASE_SERVICE_ACCOUNT_KEY_JSON = require(keyPath);
    }
    await firebase.initializeSync(FIREBASE_SERVICE_ACCOUNT_KEY_JSON)

    // Load GCP
    // await googleCalendar.setClient(FIREBASE_SERVICE_ACCOUNT_KEY_JSON)
    // await googleCalendar.list()
    // googleCloud.setClient(FIREBASE_SERVICE_ACCOUNT_KEY_JSON)

    /**
     * Models
     */
    const firestore = firebase.getFirestore()
    const selectModel = new SelectModel({
        collection: firestore.collection('selects'),
    })
    const eventModel = new EventModel({
        collection: firestore.collection('events'),
    })
    const eventDesignModel = new EventDesignModel({
        collection: firestore.collection('eventDesigns'),
    })
    const eventSchemaModel = new EventSchemaModel({
        collection: firestore.collection('eventSchemas'),
    })
    const eventActorModel = new EventActorModel({
        collection: firestore.collection('eventActors')
    })
    const eventTemplateModel = new EventTemplateModel({
        collection: firestore.collection('eventTemplates')
    })
    const eventTemplateDesignModel = new EventTemplateDesignModel({
        collection: firestore.collection('eventTemplateDesigns')
    })
    const organizationModel = new OrganizationModel({
        collection: firestore.collection('organizations'),
        publicBucket: firebase.getPublicBucket()
    })
    const organizationMemberModel = new OrganizationMemberModel({
        collection: firestore.collection('organizationMembers')
    })
    const placeModel = new PlaceModel({
        collection: firestore.collection('places')
    })

    /**
     * Services
     */
    const allServices: ILocals = {
        MetaService: new MetaService({
            selectModel,
        }),
        EventService: new EventService({
            eventModel,
            eventDesignModel,
            eventActorModel,
            eventSchemaModel,
        }),
        EventTemplateService: new EventTemplateService({
            eventTemplateModel,
            eventTemplateDesignModel,
        }),
        OrganizationService: new OrganizationService({
            organizationModel,
            organizationMemberModel,
        }),
        PlaceService: new PlaceService({
            placeModel,
        }),
        AuthService: new AuthService(firebase)
    }
    Object.assign(AccessGlobalService.locals, {
        ...allServices
    })

    /**
     * controllers
     */
    app
        .onError(({ error, code }) => {
            console.trace('Venonia Error:', {
                error
            })
            if (code === 'NOT_FOUND') return

            console.error(error)
        })
        .use(cors())
        .use(rootController)
        .use(eventController)
        .use(eventTemplateController)
        .use(organizationController)
        .use(placeController)

    // Start Listening
    app.listen(8080, ({ hostname, port }) => {
        console.log(
            `🦊 Elysia is running at ${hostname}:${port}`
        )
        const timeEnd = new Date().getTime()
        const timeDiff = (timeEnd - time) / 1000
        AccessGlobalService.locals.startupTime = timeDiff
    })
})()