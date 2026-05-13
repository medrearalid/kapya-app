import { Router } from 'express'
import { postFinanceSummary, postHealthSummary } from '../controllers/insights-controller.js'

const insightsRouter = Router()

insightsRouter.post('/health-summary', postHealthSummary)
insightsRouter.post('/finance-summary', postFinanceSummary)

export default insightsRouter
