const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const generateWasteSaverRecipes = async ({
  budgetProfile,
  pantryStock,
  urgentProducts,
}) => {
  const response = await fetch(`${API_BASE_URL}/api/ai/recipes/waste-saver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      budgetProfile,
      pantryStock,
      urgentProducts,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Tarif olusturma istegi basarisiz oldu.')
  }

  return payload?.data
}