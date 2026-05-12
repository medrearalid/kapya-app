import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:5000'

const tinyPngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5J2nEAAAAASUVORK5CYII='

const buildDataUrlFromPath = async (filePath) => {
  const buffer = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()

  const mimeTypeByExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }

  const mimeType = mimeTypeByExt[ext] || 'image/jpeg'
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  const text = await response.text()

  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

const assertStatus = ({ name, result, acceptedStatusCodes }) => {
  if (!acceptedStatusCodes.includes(result.status)) {
    throw new Error(
      `${name} failed. status=${result.status} body=${JSON.stringify(result.payload)}`,
    )
  }

  console.log(`${name} OK -> status=${result.status}`)
}

const run = async () => {
  console.log(`Running smoke tests against ${BASE_URL}`)

  const healthResult = await requestJson(`${BASE_URL}/health`)
  assertStatus({
    name: 'health',
    result: healthResult,
    acceptedStatusCodes: [200],
  })

  const recipePayload = {
    budgetProfile: 'ogrenci',
    pantryStock: [
      {
        name: 'Yumurta',
        quantity: 4,
        unit: 'adet',
        estimatedShelfLifeEndDate: '2026-05-14',
      },
      {
        name: 'Peynir',
        quantity: 1,
        unit: 'paket',
        estimatedShelfLifeEndDate: '2026-05-20',
      },
    ],
    urgentProducts: [
      {
        name: 'Yumurta',
        quantity: 4,
        unit: 'adet',
        estimatedShelfLifeEndDate: '2026-05-14',
      },
    ],
  }

  const recipeResult = await requestJson(`${BASE_URL}/api/ai/recipes/waste-saver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipePayload),
  })

  assertStatus({
    name: 'recipe-generate',
    result: recipeResult,
    acceptedStatusCodes: [200],
  })

  const receiptDataUrl = process.env.RECEIPT_IMAGE_PATH
    ? await buildDataUrlFromPath(process.env.RECEIPT_IMAGE_PATH)
    : tinyPngDataUrl

  const receiptResult = await requestJson(`${BASE_URL}/api/receipts/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageBase64: receiptDataUrl }),
  })

  // If a non-receipt image is used, 422 is expected and acceptable.
  assertStatus({
    name: 'receipt-analyze',
    result: receiptResult,
    acceptedStatusCodes: [200, 422],
  })

  console.log('Smoke test completed successfully.')
}

run().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
