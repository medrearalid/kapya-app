import { GoogleGenAI } from '@google/genai'

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const recipeResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tarifler: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tarifAdi: { type: 'string' },
          kisaAciklama: { type: 'string' },
          tahminiPorsiyonBasiMaliyet: { type: 'string' },
          malzemeler: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                baseAmount: { type: 'number' },
                unit: { type: 'string' },
              },
              required: ['name', 'baseAmount', 'unit'],
            },
          },
        },
        required: [
          'tarifAdi',
          'kisaAciklama',
          'tahminiPorsiyonBasiMaliyet',
          'malzemeler',
        ],
      },
    },
  },
  required: ['tarifler'],
}

const sanitizeProduct = (product) => ({
  urunAdi: String(product?.name ?? '').trim(),
  miktar: Number(product?.quantity ?? 0),
  birim: String(product?.unit ?? '').trim(),
  tahminiRafOmruBitisTarihi: String(product?.estimatedShelfLifeEndDate ?? '').trim(),
})

const buildPrompt = ({ budgetProfile, pantryStock, urgentProducts }) => {
  const payload = {
    kullaniciButceProfili: budgetProfile,
    mevcutKilerStogu: pantryStock,
    acilUrunler: urgentProducts,
  }

  return [
    'Sen Kapya uygulamasi icin mutfak israfini azaltan proaktif bir yemek asistansin.',
    'Asagidaki kurallara birebir uy:',
    '1) Sadece verilen stok verisini ve butce profilini kullan.',
    '2) Acil urunleri tariflerde mutlaka onceliklendir.',
    '3) Tam olarak 3 farkli yemek tarifi olustur.',
    '4) Tarifleri pratik ve butce profiline uygun maliyet seviyesinde tut.',
    '5) Malzeme listesinde her ogeyi SADECE su formatta ver: { name, baseAmount, unit }.',
    '6) baseAmount degeri her malzeme icin kesinlikle 1 KISILIK standart miktar olmalidir.',
    '7) baseAmount degeri pozitif bir sayi olmalidir (ornek: 100 gram, 1 adet, 0.25 litre).',
    '8) JSON semasi disinda hicbir metin, markdown veya aciklama dondurme.',
    '',
    `Girdi verisi: ${JSON.stringify(payload)}`,
  ].join('\n')
}

const parseJsonResponse = (rawText) => {
  if (!rawText) {
    throw new Error('AI modeli bos yanit dondurdu.')
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error('AI modeli beklenen JSON formatinda yanit dondurmedi.')
  }
}

const isValidGeneratedRecipe = (recipe) => {
  if (
    typeof recipe?.tarifAdi !== 'string' ||
    !recipe.tarifAdi.trim() ||
    !Array.isArray(recipe?.malzemeler) ||
    recipe.malzemeler.length === 0
  ) {
    return false
  }

  return recipe.malzemeler.every((ingredient) => {
    const name = String(ingredient?.name ?? '').trim()
    const baseAmount = Number(ingredient?.baseAmount)
    const unit = String(ingredient?.unit ?? '').trim()

    return Boolean(name && unit && Number.isFinite(baseAmount) && baseAmount > 0)
  })
}

export const generateWasteSaverRecipes = async ({
  budgetProfile,
  pantryStock,
  urgentProducts,
}) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    const missingKeyError = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    missingKeyError.statusCode = 500
    throw missingKeyError
  }

  const normalizedBudgetProfile = String(budgetProfile ?? '').trim().toLowerCase()
  const normalizedPantryStock = (Array.isArray(pantryStock) ? pantryStock : [])
    .map(sanitizeProduct)
    .filter((product) => product.urunAdi)
  const normalizedUrgentProducts = (Array.isArray(urgentProducts) ? urgentProducts : [])
    .map(sanitizeProduct)
    .filter((product) => product.urunAdi)

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: buildPrompt({
      budgetProfile: normalizedBudgetProfile,
      pantryStock: normalizedPantryStock,
      urgentProducts: normalizedUrgentProducts,
    }),
    config: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseJsonSchema: recipeResponseJsonSchema,
    },
  })

  const parsedResponse = parseJsonResponse(response.text?.trim())
  if (!Array.isArray(parsedResponse?.tarifler) || parsedResponse.tarifler.length !== 3) {
    throw new Error('AI modeli 3 tariften olusan gecerli bir sonuc dondurmedi.')
  }

  if (!parsedResponse.tarifler.every(isValidGeneratedRecipe)) {
    throw new Error('AI modeli 1 kisilik baseAmount formatini saglamayan tarif dondurdu.')
  }

  return parsedResponse
}