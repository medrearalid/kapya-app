import { executeKapyaAgent, executeRecipeByNameAgent } from '../services/agentService.js'

const VALID_MEAL_TYPES = new Set(['kahvalti', 'ogle', 'aksam'])
const VALID_DISH_CATEGORIES = new Set(['ana_yemek', 'corba', 'tatli', 'atistirmalik'])

const sendBadRequest = (response, errorMessage) =>
  response.status(400).json({
    success: false,
    error: errorMessage,
  })

const validateOptionalArray = (value, key) => {
  if (value === undefined || Array.isArray(value)) {
    return ''
  }

  return `Gecersiz istek govdesi. ${key} alani dizi olmalidir.`
}

const validateByNameRequest = ({
  pantryStock,
  focusedIngredients,
  preferences,
  recentRecipeNames,
  guidedContext,
  mealType,
  dishCategory,
}) => {
  const arrayErrors = [
    validateOptionalArray(pantryStock, 'pantryStock'),
    validateOptionalArray(focusedIngredients, 'focusedIngredients'),
    validateOptionalArray(preferences, 'preferences'),
    validateOptionalArray(recentRecipeNames, 'recentRecipeNames'),
  ]

  const firstArrayError = arrayErrors.find(Boolean)
  if (firstArrayError) {
    return firstArrayError
  }

  if (
    guidedContext !== undefined &&
    (guidedContext === null || typeof guidedContext !== 'object' || Array.isArray(guidedContext))
  ) {
    return 'Gecersiz istek govdesi. guidedContext alani nesne olmalidir.'
  }

  if (mealType && !VALID_MEAL_TYPES.has(mealType)) {
    return 'Gecersiz istek govdesi. mealType alani kahvalti, ogle veya aksam olmalidir.'
  }

  if (dishCategory && !VALID_DISH_CATEGORIES.has(dishCategory)) {
    return 'Gecersiz istek govdesi. dishCategory alani ana_yemek, corba, tatli veya atistirmalik olmalidir.'
  }

  return ''
}

const hasAnyByNameCriteria = ({
  mealName,
  isLucky,
  mealType,
  dishCategory,
  focusedIngredients,
  preferences,
  guidedContext,
}) =>
  Boolean(mealName) ||
  isLucky ||
  Boolean(mealType) ||
  Boolean(dishCategory) ||
  (Array.isArray(focusedIngredients) && focusedIngredients.length > 0) ||
  (Array.isArray(preferences) && preferences.length > 0) ||
  (guidedContext && typeof guidedContext === 'object')

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
    const guidedContext = request.body?.guidedContext

    const validationError = validateByNameRequest({
      pantryStock,
      focusedIngredients,
      preferences,
      recentRecipeNames,
      guidedContext,
      mealType,
      dishCategory,
    })
    if (validationError) {
      return sendBadRequest(response, validationError)
    }

    if (
      !hasAnyByNameCriteria({
        mealName,
        isLucky,
        mealType,
        dishCategory,
        focusedIngredients,
        preferences,
        guidedContext,
      })
    ) {
      return sendBadRequest(
        response,
        'Gecersiz istek govdesi. mealName, mealType, dishCategory, isLucky, focusedIngredients, preferences veya guidedContext alanlarindan en az biri zorunludur.',
      )
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
      guidedContext,
    })

    return response.status(200).json({
      success: true,
      data: recipeData,
    })
  } catch (error) {
    next(error)
  }
}
