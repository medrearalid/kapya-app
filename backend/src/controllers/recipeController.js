import { executeKapyaAgent } from '../services/agentService.js'

export const postWasteSaverRecipes = async (request, response, next) => {
  try {
    const { budgetProfile, pantryStock, urgentProducts } = request.body ?? {}

    if (!budgetProfile || !Array.isArray(pantryStock) || !Array.isArray(urgentProducts)) {
      return response.status(400).json({
        success: false,
        error:
          'Gecersiz istek govdesi. budgetProfile, pantryStock ve urgentProducts alanlari zorunludur.',
      })
    }

    const agentData = await executeKapyaAgent({
      budgetProfile,
      pantryStock,
      urgentProducts,
    })

    return response.status(200).json({
      success: true,
      data: agentData,
    })
  } catch (error) {
    next(error)
  }
}
