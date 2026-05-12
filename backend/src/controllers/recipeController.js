import { executeKapyaAgent, executeRecipeByNameAgent } from '../services/agentService.js'

export const postWasteSaverRecipes = async (request, response, next) => {
  try {
    const {
      budgetProfile,
      pantryStock,
      urgentProducts,
      agentInstruction,
      requestMode,
      recentRecipeNames,
    } = request.body ?? {}

    if (!budgetProfile || !Array.isArray(pantryStock) || !Array.isArray(urgentProducts)) {
      return response.status(400).json({
        success: false,
        error:
          'Gecersiz istek govdesi. budgetProfile, pantryStock ve urgentProducts alanlari zorunludur.',
      })
    }

    if (recentRecipeNames !== undefined && !Array.isArray(recentRecipeNames)) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. recentRecipeNames alani dizi olmalidir.',
      })
    }

    const agentData = await executeKapyaAgent({
      budgetProfile,
      pantryStock,
      urgentProducts,
      agentInstruction,
      requestMode,
      recentRecipeNames,
    })

    return response.status(200).json({
      success: true,
      data: agentData,
    })
  } catch (error) {
    next(error)
  }
}

export const postGenerateRecipeByName = async (request, response, next) => {
  try {
    const mealName = String(request.body?.mealName ?? '').trim()

    if (!mealName) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. mealName alani zorunludur.',
      })
    }

    const recipeData = await executeRecipeByNameAgent({ mealName })

    return response.status(200).json({
      success: true,
      data: recipeData,
    })
  } catch (error) {
    next(error)
  }
}
