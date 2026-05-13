const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

const buildCompactImageCachePayload = (imageCacheByRecipeName) => {
  if (!imageCacheByRecipeName || typeof imageCacheByRecipeName !== 'object') {
    return {}
  }

  const compactEntries = []

  for (const [recipeName, imageUrl] of Object.entries(imageCacheByRecipeName)) {
    const normalizedName = String(recipeName ?? '').trim()
    const normalizedUrl = String(imageUrl ?? '').trim()

    if (!normalizedName || !normalizedUrl) {
      continue
    }

    // Keep payload lean: only short remote URLs, exclude large data-uri blobs.
    if (!/^https?:\/\//i.test(normalizedUrl) || normalizedUrl.length > 1024) {
      continue
    }

    compactEntries.push([normalizedName, normalizedUrl])
    if (compactEntries.length >= 60) {
      break
    }
  }

  return Object.fromEntries(compactEntries)
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
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
  mealType,
  imageCacheByRecipeName,
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

  const normalizedMealType = String(mealType ?? '').trim()
  if (normalizedMealType) {
    payload.mealType = normalizedMealType
  }

  const compactImageCacheByRecipeName = buildCompactImageCachePayload(imageCacheByRecipeName)
  if (Object.keys(compactImageCacheByRecipeName).length > 0) {
    payload.imageCacheByRecipeName = compactImageCacheByRecipeName
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

  const data = responsePayload?.data
  if (data?.error === true) {
    const hallucinationError = new Error(data.message || 'HALLUCINATION_ERROR')
    hallucinationError.code = 'HALLUCINATION'
    throw hallucinationError
  }

  return data?.tarif || null
}