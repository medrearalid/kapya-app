const PROD_BACKEND_URL = 'https://kapya-app.onrender.com'
const DEV_BACKEND_URL = 'http://localhost:5000'
const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? PROD_BACKEND_URL : DEV_BACKEND_URL),
).replace(/\/$/, '')

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

// Parses one SSE "data: {...}" line. Returns null if not a data line or invalid JSON.
const parseSseLine = (line) => {
  if (!line.startsWith('data: ')) return null
  try { return JSON.parse(line.slice(6)) } catch { return null }
}

// Processes buffered lines; returns final data or null if still streaming.
const processLines = (lines, onLog) => {
  for (const line of lines) {
    const event = parseSseLine(line)
    if (!event) continue
    if (event.type === 'log' && typeof onLog === 'function') onLog(event.message)
    if (event.type === 'done') return event.data
    if (event.type === 'error') throw new Error(event.message)
  }
  return null
}

// Reads stream chunks until 'done' event; calls onLog for each log event.
const readSseStream = async (reader, onLog) => {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    const result = processLines(lines, onLog)
    if (result !== null) return result
  }

  throw new Error('Stream beklenmedik sekilde kapandi.')
}

// Streaming variant — onLog called for each SSE log, resolves with final data.
export const streamInsight = async (payload, onLog) => {
  const response = await fetch(buildApiUrl('/api/ai/insights/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error || 'Insight streami alinamadi.')
  }

  return readSseStream(response.body.getReader(), onLog)
}

export const getHealthSummary = ({ plannedMeals, userContext }) =>
  triggerInsight({ trigger: 'planner_page', plannedMeals, userContext })

export const getFinanceSummary = ({ pantryProducts, financeData, userContext }) =>
  triggerInsight({ trigger: 'wallet_page', pantryProducts, financeData, userContext })

