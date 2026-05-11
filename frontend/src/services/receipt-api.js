const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const analyzeReceiptImage = async ({ imageBase64 }) => {
  const response = await fetch(`${API_BASE_URL}/api/receipts/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageBase64 }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'RECEIPT_ANALYZE_FAILED')
  }

  return Array.isArray(payload?.data) ? payload.data : []
}