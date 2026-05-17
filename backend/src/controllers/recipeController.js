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
    const pantryStock = request.body?.pantryStock
    const focusedIngredients = request.body?.focusedIngredients
    const preferences = request.body?.preferences
    const isLucky = request.body?.isLucky === true
    const mealType = String(request.body?.mealType ?? '').trim().toLowerCase()
    const dishCategory = String(request.body?.dishCategory ?? '').trim().toLowerCase()
    const recentRecipeNames = request.body?.recentRecipeNames

    if (pantryStock !== undefined && !Array.isArray(pantryStock)) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. pantryStock alani dizi olmalidir.',
      })
    }

    if (focusedIngredients !== undefined && !Array.isArray(focusedIngredients)) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. focusedIngredients alani dizi olmalidir.',
      })
    }

    if (preferences !== undefined && !Array.isArray(preferences)) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. preferences alani dizi olmalidir.',
      })
    }

    if (recentRecipeNames !== undefined && !Array.isArray(recentRecipeNames)) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. recentRecipeNames alani dizi olmalidir.',
      })
    }

    if (mealType && !['kahvalti', 'ogle', 'aksam'].includes(mealType)) {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. mealType alani kahvalti, ogle veya aksam olmalidir.',
      })
    }

    if (
      dishCategory &&
      !['ana_yemek', 'corba', 'tatli', 'atistirmalik'].includes(dishCategory)
    ) {
      return response.status(400).json({
        success: false,
        error:
          'Gecersiz istek govdesi. dishCategory alani ana_yemek, corba, tatli veya atistirmalik olmalidir.',
      })
    }

    const hasAnySmartCriteria =
      Boolean(mealName) ||
      isLucky ||
      Boolean(mealType) ||
      (Array.isArray(focusedIngredients) && focusedIngredients.length > 0) ||
      (Array.isArray(preferences) && preferences.length > 0)

    if (!hasAnySmartCriteria) {
      return response.status(400).json({
        success: false,
        error:
          'Gecersiz istek govdesi. mealName, mealType, isLucky, focusedIngredients veya preferences alanlarindan en az biri zorunludur.',
      })
    }

    const recipeData = await executeRecipeByNameAgent({
      mealName,
      pantryStock,
      focusedIngredients,
      preferences,
      isLucky,
      mealType,
      dishCategory,
      recentRecipeNames,
    })

    return response.status(200).json({
      success: true,
      data: recipeData,
    })
  } catch (error) {
    next(error)
  }
}
