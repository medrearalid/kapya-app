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