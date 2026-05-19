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
                isim: { type: 'string' },
                bazMiktar: { type: 'number' },
                birim: { type: 'string' },
              },
              required: ['isim', 'bazMiktar', 'birim'],
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
    '3) Yalnızca bir yemek tarifi olustur ve TEK bir JSON yaniti olarak döndür.',
    '4) Tarifleri pratik ve gercekci maliyet seviyesinde tut.',
    '5) Tahmini porsiyon basi maliyeti kisa metin olarak ver (ornek: "45-60 TL").',
    '6) Malzeme listesinde her malzeme icin kisi sayisina gore carpilabilecek baz miktar ve birim yaz.',
    '7) BAGIMSIZ DEGISKEN VE IKAME: Bir tarif sivi yag gerektiriyorsa ve dolabimizda zeytinyagi veya tereyagi varsa, o malzemeyi eksik sayma; dolapta olanla ikame et. Benzer sekilde limon suyu-limon gibi mantikli ikameler uygula.',
    '8) ONCELIK SIRASI: Her seyden once SADECE dolaptaki malzemelerle yapilabilecek (eksik=0) tarifleri bul ve oner. Dolap cok bossa ve hic secenegin yoksa maksimum 1-2 eksik malzemeli tarifler ekle; fazlasini asla ekleme.',
    '9) JSON semasi disinda hicbir metin, markdown veya aciklama dondurme.',
    '10) TARIF ADLANDIRMA: Tarif isimleri (tarifAdi) kesinlikle yapay, suslu, soyut veya edebi olmamalidir (ornek: "Tava Surprizi", "Sebze Ruyasi", "Lezzet Senligi" KESINLIKLE YASAKTIR). Tarif isimleri yemeğin kendisini en net, en sade ve en geleneksel sekilde yansitmali, dogrudan Turk mutfagindaki bilinen adlari olmalidir (ornek: "Omlet", "Sucuklu Yumurta", "Makarna", "Pirinc Pilavi", "Kuru Fasulye", "Menemen", "Mercimek Corbasi", "Irmik Helvasi", "Tavuk Sote", "Izmir Kofte").',
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

  return parsedResponse
}