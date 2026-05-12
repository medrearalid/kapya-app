import { GoogleGenAI } from '@google/genai'

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const RECEIPT_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash-lite'
const RECEIPT_CLASSIFIER_MODEL =
  process.env.GEMINI_RECEIPT_CLASSIFIER_MODEL || 'gemini-2.5-flash-lite'

const RECEIPT_ALLOWED_UNITS = new Set([
  'adet',
  'gram',
  'paket',
  'litre',
  'mevcut',
])

const RECEIPT_NON_FOOD_KEYWORDS = [
  'bardak',
  'bardagi',
  'tabak',
  'kase',
  'kupa',
  'kasik',
  'catal',
  'bicak',
  'sunger',
  'deterjan',
  'sabun',
  'sampuan',
  'dis macunu',
  'pecete',
  'tuvalet kagidi',
  'cop poseti',
  'kristal tasli',
  'tasli',
]

const RECEIPT_READY_TO_EAT_KEYWORDS = [
  'yas pasta',
  'pasta',
  'tatli',
  'baklava',
  'kek',
  'kurabiye',
  'sandvic',
  'durum',
  'hamburger',
  'pizza',
  'lahmacun',
  'hazir yemek',
]

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

const receiptResponseJsonSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      quantity: { type: 'number' },
      unit: { type: 'string' },
      price: { type: 'number' },
      estimatedShelfLifeDays: { type: 'number' },
      kategori: { type: 'string' },
    },
    required: ['name', 'quantity', 'unit', 'price', 'estimatedShelfLifeDays', 'kategori'],
  },
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

const parseReceiptJsonResponse = (rawText) => {
  const parsed = parseJsonResponse(rawText)
  if (!Array.isArray(parsed)) {
    const responseFormatError = new TypeError('Fis analizi sonucu gecerli bir JSON dizisi degil.')
    responseFormatError.statusCode = 502
    throw responseFormatError
  }

  const normalizeReceiptText = (value) =>
    String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replaceAll('ç', 'c')
      .replaceAll('ğ', 'g')
      .replaceAll('ı', 'i')
      .replaceAll('ö', 'o')
      .replaceAll('ş', 's')
      .replaceAll('ü', 'u')

  const normalizeReceiptUnit = (value) => {
    const normalizedUnit = normalizeReceiptText(value)
      .replaceAll('.', '')
      .replaceAll(',', '')

    if (['adet', 'ad', 'tane'].includes(normalizedUnit)) {
      return 'adet'
    }

    if (['gram', 'gr'].includes(normalizedUnit)) {
      return 'gram'
    }

    if (['paket', 'pkt', 'pk'].includes(normalizedUnit)) {
      return 'paket'
    }

    if (['litre', 'lt', 'l'].includes(normalizedUnit)) {
      return 'litre'
    }

    if (['var', 'mevcut'].includes(normalizedUnit)) {
      return 'var'
    }

    return ''
  }

  const hasAnyKeyword = (name, keywordList) =>
    keywordList.some((keyword) => name.includes(keyword))

  const isReadyToEatOrPrepared = (normalizedName) => {
    if (hasAnyKeyword(normalizedName, RECEIPT_READY_TO_EAT_KEYWORDS)) {
      return true
    }

    return /\b\d+\s*-\s*\d+\s*kisilik\b/u.test(normalizedName)
  }

  const isLikelyNonFood = (normalizedName) =>
    hasAnyKeyword(normalizedName, RECEIPT_NON_FOOD_KEYWORDS)

  const normalizedItems = parsed
    .map((item) => ({
      name: String(item?.name ?? item?.isim ?? '').trim(),
      quantity: Number(item?.quantity ?? item?.miktar ?? 0),
      unit: normalizeReceiptUnit(item?.unit ?? item?.birim),
      price: Number(item?.price ?? item?.fiyat ?? 0),
      estimatedShelfLifeDays: Number(
        item?.estimatedShelfLifeDays ?? item?.tahminiRafOmruGun ?? 0,
      ),
      kategori: String(item?.kategori ?? '').trim() || 'Diğer',
    }))
    .filter((item) => {
      const normalizedName = normalizeReceiptText(item.name)
      if (!normalizedName) {
        return false
      }

      if (isLikelyNonFood(normalizedName) || isReadyToEatOrPrepared(normalizedName)) {
        return false
      }

      return true
    })
    .filter(
      (item) =>
        item.name &&
        RECEIPT_ALLOWED_UNITS.has(item.unit) &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        Number.isFinite(item.estimatedShelfLifeDays) &&
        item.estimatedShelfLifeDays > 0,
    )

  if (normalizedItems.length === 0) {
    const noItemsError = new Error('Fisten gecerli gida urunu cikartilamadi. Daha net bir fis gorseli deneyin.')
    noItemsError.statusCode = 422
    throw noItemsError
  }

  return normalizedItems
}

const parseDataUrl = (imageBase64) => {
  const rawInput = String(imageBase64 ?? '').trim()
  if (!rawInput) {
    const invalidInputError = new Error('Gecerli bir fis gorseli gonderilmedi.')
    invalidInputError.statusCode = 400
    throw invalidInputError
  }

  const dataUrlRegex = /^data:(.+);base64,(.+)$/
  const dataUrlMatch = dataUrlRegex.exec(rawInput)
  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1]
    if (!mimeType.startsWith('image/')) {
      const invalidMimeError = new Error('Gonderilen dosya bir gorsel degil.')
      invalidMimeError.statusCode = 400
      throw invalidMimeError
    }

    return {
      mimeType,
      base64Data: dataUrlMatch[2],
    }
  }

  return {
    mimeType: 'image/jpeg',
    base64Data: rawInput,
  }
}

export const analyzeReceiptImage = async ({ imageBase64 }) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    const missingKeyError = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    missingKeyError.statusCode = 500
    throw missingKeyError
  }

  const { mimeType, base64Data } = parseDataUrl(imageBase64)
  const ai = new GoogleGenAI({ apiKey })

  let classifierResult
  try {
    classifierResult = await ai.models.generateContent({
      model: RECEIPT_CLASSIFIER_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Bu gorselin market/perakende satis fisi olup olmadigini kontrol et.',
                'Sadece iki olasi cikti var: RECEIPT veya NON_RECEIPT.',
                'Aciklama ekleme.',
              ].join(' '),
            },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 8,
      },
    })
  } catch {
    const providerError = new Error('Fis dogrulamasi yapilamadi.')
    providerError.statusCode = 502
    throw providerError
  }

  const classificationText = String(classifierResult?.text ?? '')
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-Z]/g, '_')

  if (classificationText.includes('NON_RECEIPT')) {
    const nonReceiptError = new Error('Gonderilen gorsel fis fotografi degildi.')
    nonReceiptError.statusCode = 422
    throw nonReceiptError
  }

  if (!classificationText.includes('RECEIPT')) {
    const ambiguousReceiptError = new Error('Gorsel fis olarak dogrulanamadi.')
    ambiguousReceiptError.statusCode = 422
    throw ambiguousReceiptError
  }

  const prompt = [
    'Bu gorsel bir market/perakende satis fisidir.',
    'Sadece buzdolabina veya mutfak stok yonetimine uygun temel gida malzemelerini cikart.',
    'Hazir tuketime uygun urunleri ASLA ekleme (ornek: yas pasta, tatli, sandvic, hazir yemek).',
    'Gida disi urunleri ASLA ekleme (ornek: bardak, tabak, mutfak esyasi, temizlik urunu).',
    'Emin degilsen urunu hic ekleme.',
    'Her urun icin su alanlari dondur: name, quantity, unit, price, estimatedShelfLifeDays, kategori.',
    'KURAL 1 - URUN ADI: Fisteki tum kisaltmalari ve kodlari duzelterek temiz Turkce ile Türkçe karakter kullanarak yaz; sadece ilk harfi buyuk olsun (Ornek: "DMT 1KG"->"Domates", "YMR"->"Yumurta", "ZYT YAG 0.75L"->"Zeytinyagi").',
    'KURAL 2 - BIRIM: Stoktan düşme hesabını doğru yapabilmek için; hassas birimler kullan (Ornek: 1.5 kg->1500 gram). Kabul edilen birimler: adet, gram, paket, litre, mevcut.',
    'KURAL 3 - BAHARAT: Baharat turundeki her urun (tuz, karabiber, kimyon, pul biber vs.) icin quantity=1 ve unit="var" kullan.',
    'KURAL 4 - KATEGORI: Her urune su kategorilerden birini ata: Sebzeler, Meyveler, Et ve Tavuk, Sut Urunleri, Baharatlar, Atistirmaliklar, Temel Gida, Diger.',
    'KURAL 5 - FIYAT: Fisteki satir toplam fiyatini TL cinsinden numeric olarak KESINLIKLE ekle (price > 0).',
    'KURAL 6: estimatedShelfLifeDays pozitif sayi olsun.',
    'Sonucu sadece JSON dizisi olarak dondur.',
  ].join(' ')

  let result
  try {
    result = await ai.models.generateContent({
      model: RECEIPT_VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseJsonSchema: receiptResponseJsonSchema,
      },
    })
  } catch {
    const providerError = new Error('Fis analizi icin AI servisinden yanit alinamadi.')
    providerError.statusCode = 502
    throw providerError
  }

  const rawText = String(result?.text ?? '').trim()
  return parseReceiptJsonResponse(rawText)
}