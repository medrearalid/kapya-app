const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

export const generateWasteSaverRecipes = async ({
  budgetProfile,
  pantryStock,
  urgentProducts,
  agentInstruction,
  requestMode,
  recentRecipeNames,
}) => {
  const payload = {
    budgetProfile,
    pantryStock,
    urgentProducts,
    agentInstruction,
    requestMode,
  }

  if (Array.isArray(recentRecipeNames) && recentRecipeNames.length > 0) {
    payload.recentRecipeNames = recentRecipeNames
  }

  const response = await fetch(buildApiUrl('/api/ai/recipes/waste-saver'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responsePayload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(responsePayload?.error || 'RECIPE_GENERATION_FAILED')
  }

  return responsePayload?.data
}

export const generateRecipeByName = async ({
  mealName,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
}) => {
  const payload = {
    mealName: String(mealName ?? '').trim(),
  }

  if (Array.isArray(pantryStock) && pantryStock.length > 0) {
    payload.pantryStock = pantryStock
  }

  if (Array.isArray(focusedIngredients) && focusedIngredients.length > 0) {
    payload.focusedIngredients = focusedIngredients
  }

  if (Array.isArray(preferences) && preferences.length > 0) {
    payload.preferences = preferences
  }

  if (isLucky === true) {
    payload.isLucky = true
  }

  const response = await fetch(buildApiUrl('/api/ai/recipes/by-name'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responsePayload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(responsePayload?.error || 'RECIPE_BY_NAME_FAILED')
  }

  return responsePayload?.data?.tarif || null
}