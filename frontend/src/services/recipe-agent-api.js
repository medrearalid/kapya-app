const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

const toCleanStringArray = (values, limit = Number.POSITIVE_INFINITY) =>
  (Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .slice(0, limit)

const setArrayFieldIfAny = (payload, key, values) => {
  if (Array.isArray(values) && values.length > 0) {
    payload[key] = values
  }
}

const setStringFieldIfAny = (payload, key, value) => {
  const normalized = String(value ?? '').trim()
  if (normalized) {
    payload[key] = normalized
  }
}

const toGuidedContextPayload = (guidedContext) => {
  if (!guidedContext || typeof guidedContext !== 'object' || Array.isArray(guidedContext)) {
    return null
  }

  return {
    category: String(guidedContext?.category ?? '').trim(),
    focusIngredients: toCleanStringArray(guidedContext?.focusIngredients),
    cookingTechnique: String(guidedContext?.cookingTechnique ?? '').trim(),
    dietGoal: String(guidedContext?.dietGoal ?? '').trim(),
  }
}

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

  const data = responsePayload?.data
  if (data?.error === true) {
    const hallucinationError = new Error(data.message || 'HALLUCINATION_ERROR')
    hallucinationError.code = 'HALLUCINATION'
    throw hallucinationError
  }

  return data
}

export const generateRecipeByName = async ({
  mealName,
  dishCategory,
  pantryStock,
  focusedIngredients,
  preferences,
  guidedContext,
  isLucky,
  mealType,
  recentRecipeNames,
}) => {
  const payload = {
    mealName: String(mealName ?? '').trim(),
  }

  setArrayFieldIfAny(payload, 'pantryStock', pantryStock)
  setArrayFieldIfAny(payload, 'focusedIngredients', focusedIngredients)
  setArrayFieldIfAny(payload, 'preferences', preferences)

  const normalizedGuidedContext = toGuidedContextPayload(guidedContext)
  if (normalizedGuidedContext) {
    payload.guidedContext = normalizedGuidedContext
  }

  const normalizedRecentRecipeNames = toCleanStringArray(recentRecipeNames, 20)
  if (normalizedRecentRecipeNames.length > 0) {
    payload.recentRecipeNames = normalizedRecentRecipeNames
  }

  if (isLucky === true) {
    payload.isLucky = true
  }

  setStringFieldIfAny(payload, 'mealType', mealType)
  setStringFieldIfAny(payload, 'dishCategory', dishCategory)

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

  const data = responsePayload?.data
  if (data?.error === true) {
    const hallucinationError = new Error(data.message || 'HALLUCINATION_ERROR')
    hallucinationError.code = 'HALLUCINATION'
    throw hallucinationError
  }

  return data?.tarif || null
}