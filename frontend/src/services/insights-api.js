const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

// Single unified trigger — Supervisor decides which worker to run server-side.
const triggerInsight = async (payload) => {
  const response = await fetch(buildApiUrl('/api/ai/insights/trigger'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error || 'Insight alinamadi.')
  }

  const json = await response.json()
  if (!json.success || !json.data) {
    throw new Error('Gecersiz insight yaniti.')
  }

  return json.data
}

export const getHealthSummary = ({ plannedMeals, userContext }) =>
  triggerInsight({ trigger: 'planner_page', plannedMeals, userContext })

export const getFinanceSummary = ({ pantryProducts, financeData, userContext }) =>
  triggerInsight({ trigger: 'wallet_page', pantryProducts, financeData, userContext })
