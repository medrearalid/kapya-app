import { runDietitianAgent, runFinanceAgent } from '../services/multi-agent-service.js'

export const postHealthSummary = async (request, response, next) => {
  try {
    const { plannedMeals, userContext } = request.body ?? {}

    if (plannedMeals !== undefined && !Array.isArray(plannedMeals)) {
      return response.status(400).json({
        success: false,
        error: 'plannedMeals alani dizi olmalidir.',
      })
    }

    const result = await runDietitianAgent({
      plannedMeals: Array.isArray(plannedMeals) ? plannedMeals : [],
      userContext: userContext && typeof userContext === 'object' ? userContext : {},
    })

    const uiData = { ...result }
    delete uiData._reasoning

    return response.status(200).json({ success: true, data: uiData })
  } catch (error) {
    next(error)
  }
}

export const postFinanceSummary = async (request, response, next) => {
  try {
    const { pantryProducts, financeData, userContext } = request.body ?? {}

    if (pantryProducts !== undefined && !Array.isArray(pantryProducts)) {
      return response.status(400).json({
        success: false,
        error: 'pantryProducts alani dizi olmalidir.',
      })
    }

    const result = await runFinanceAgent({
      pantryProducts: Array.isArray(pantryProducts) ? pantryProducts : [],
      financeData: financeData && typeof financeData === 'object' ? financeData : {},
      userContext: userContext && typeof userContext === 'object' ? userContext : {},
    })

    const uiDataFin = { ...result }
    delete uiDataFin._reasoning

    return response.status(200).json({ success: true, data: uiDataFin })
  } catch (error) {
    next(error)
  }
}
