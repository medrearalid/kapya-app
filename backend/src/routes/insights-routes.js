import { Router } from 'express'
import { postInsightTrigger } from '../controllers/insights-controller.js'

const insightsRouter = Router()

insightsRouter.post('/trigger', postInsightTrigger)

export default insightsRouter
