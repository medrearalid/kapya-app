import { runInsightAgent, runInsightAgentStreaming } from '../services/multi-agent-service.js'

const VALID_TRIGGERS = new Set(['planner_page', 'wallet_page'])

export const streamInsightTrigger = async (request, response, next) => {
  try {
    const { trigger, plannedMeals, pantryProducts, financeData, userContext, developerMode } =
      request.body ?? {}

    if (!trigger || !VALID_TRIGGERS.has(String(trigger))) {
      return response.status(400).json({
        success: false,
        error: `trigger gecersiz. Kabul edilenler: ${Array.from(VALID_TRIGGERS).join(', ')}`,
      })
    }

    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache')
    response.setHeader('Connection', 'keep-alive')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders()

    const emit = (message) => {
      response.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`)
    }

    const result = await runInsightAgentStreaming(
      {
        trigger: String(trigger),
        plannedMeals: Array.isArray(plannedMeals) ? plannedMeals : [],
        pantryProducts: Array.isArray(pantryProducts) ? pantryProducts : [],
        financeData: financeData && typeof financeData === 'object' ? financeData : {},
        userContext: userContext && typeof userContext === 'object' ? userContext : {},
        developerMode: developerMode === true,
      },
      emit,
    )

    if (!result) {
      response.write(`data: ${JSON.stringify({ type: 'error', message: 'Supervisor ajan analiz uretmedi.' })}\n\n`)
      return response.end()
    }

    const uiData = { ...result }
    delete uiData._reasoning
    response.write(`data: ${JSON.stringify({ type: 'done', data: uiData })}\n\n`)
    response.end()
  } catch (error) {
    if (!response.headersSent) {
      return next(error)
    }
    response.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
    response.end()
  }
}

export const postInsightTrigger = async (request, response, next) => {
  try {
    const { trigger, plannedMeals, pantryProducts, financeData, userContext, developerMode } =
      request.body ?? {}

    if (!trigger || !VALID_TRIGGERS.has(String(trigger))) {
      return response.status(400).json({
        success: false,
        error: `trigger gecersiz. Kabul edilenler: ${Array.from(VALID_TRIGGERS).join(', ')}`,
      })
    }

    const result = await runInsightAgent({
      trigger: String(trigger),
      plannedMeals: Array.isArray(plannedMeals) ? plannedMeals : [],
      pantryProducts: Array.isArray(pantryProducts) ? pantryProducts : [],
      financeData: financeData && typeof financeData === 'object' ? financeData : {},
      userContext: userContext && typeof userContext === 'object' ? userContext : {},
      developerMode: developerMode === true,
    })

    if (!result) {
      const serviceError = new Error('Supervisor ajan analiz uretmedi.')
      serviceError.statusCode = 503
      throw serviceError
    }

    const uiData = { ...result }
    delete uiData._reasoning

    return response.status(200).json({ success: true, data: uiData })
  } catch (error) {
    next(error)
  }
}
