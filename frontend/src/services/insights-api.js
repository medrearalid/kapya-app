const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

export const getHealthSummary = async ({ plannedMeals, userContext }) => {
  const response = await fetch(buildApiUrl('/api/ai/insights/health-summary'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plannedMeals: Array.isArray(plannedMeals) ? plannedMeals : [],
      userContext: userContext ?? {},
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error || 'Saglik ozeti alinamadi.')
  }

  const json = await response.json()
  if (!json.success || !json.data) {
    throw new Error('Gecersiz saglik ozeti yaniti.')
  }

  return json.data
}

export const getFinanceSummary = async ({ pantryProducts, financeData, userContext }) => {
  const response = await fetch(buildApiUrl('/api/ai/insights/finance-summary'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pantryProducts: Array.isArray(pantryProducts) ? pantryProducts : [],
      financeData: financeData ?? {},
      userContext: userContext ?? {},
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error || 'Finans ozeti alinamadi.')
  }

  const json = await response.json()
  if (!json.success || !json.data) {
    throw new Error('Gecersiz finans ozeti yaniti.')
  }

  return json.data
}
