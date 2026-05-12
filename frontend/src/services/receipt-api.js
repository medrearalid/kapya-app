const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

export const analyzeReceiptImage = async ({ imageBase64 }) => {
  let response
  try {
    response = await fetch(buildApiUrl('/api/receipts/analyze'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64 }),
    })
  } catch {
    throw new Error('RECEIPT_NETWORK_ERROR')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'RECEIPT_ANALYZE_FAILED')
  }

  return Array.isArray(payload?.data) ? payload.data : []
}