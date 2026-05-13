import { Router } from 'express'
import { postInsightTrigger, streamInsightTrigger } from '../controllers/insights-controller.js'

const insightsRouter = Router()

insightsRouter.post('/trigger', postInsightTrigger)
insightsRouter.post('/stream', streamInsightTrigger)

export default insightsRouter
