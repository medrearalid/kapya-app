import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { DynamicTool } from '@langchain/core/tools'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
const MS_PER_DAY = 1000 * 60 * 60 * 24

const BUDGET_PROFILES = {
  ogrenci: {
    outsideOrderCost: 260,
    homeCookCost: 95,
    recipeCostLabel: '30-50 TL',
  },
  aile: {
    outsideOrderCost: 430,
    homeCookCost: 175,
    recipeCostLabel: '55-95 TL',
  },
  luks: {
    outsideOrderCost: 720,
    homeCookCost: 340,
    recipeCostLabel: '120-190 TL',
  },
}

const DEFAULT_BUDGET_PROFILE = 'ogrenci'

const SYSTEM_PROMPT =
  "Sen 'Kapya' adlı uygulamanın proaktif finans ve mutfak şefi ajanısın. Görevin israfı önlemek ve bütçeyi korumaktır. Kullanıcıdan gelen isteğe göre önce envanteri analiz et, tasarrufu hesapla ve uygun tarifleri üret."

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value, minValue, maxValue) => Math.min(Math.max(value, minValue), maxValue)

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')

const normalizeBudgetProfile = (value) => {
  const normalized = normalizeText(value)
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ç', 'c')

  if (normalized in BUDGET_PROFILES) {
    return normalized
  }

  return DEFAULT_BUDGET_PROFILE
}

const calculateDaysLeft = (dateValue) => {
  const targetDate = new Date(String(dateValue ?? '').trim())
  if (Number.isNaN(targetDate.getTime())) {
    return null
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  )

  return Math.ceil((startOfTarget.getTime() - startOfToday.getTime()) / MS_PER_DAY)
}

const sanitizeProduct = (product) => ({
  name: String(product?.name ?? product?.urunAdi ?? '').trim(),
  quantity: Math.max(0, toSafeNumber(product?.quantity ?? product?.miktar, 0)),
  unit: String(product?.unit ?? product?.birim ?? 'adet').trim() || 'adet',
  estimatedShelfLifeEndDate: String(
    product?.estimatedShelfLifeEndDate ?? product?.tahminiRafOmruBitisTarihi ?? '',
  ).trim(),
})

const sanitizeProductList = (products) =>
  (Array.isArray(products) ? products : []).map(sanitizeProduct).filter((item) => item.name)

const safeParseJson = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return {}
  }

  const trimmed = rawValue.trim()
  if (!trimmed) {
    return {}
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return {}
  }
}

const buildCriticalProducts = ({ pantryStock, urgentProducts }) => {
  const criticalMap = new Map()

  const pushCritical = (product, daysLeft = null) => {
    const key = `${normalizeText(product.name)}::${normalizeText(product.unit)}`
    if (criticalMap.has(key)) {
      return
    }

    criticalMap.set(key, {
      name: product.name,
      quantity: Math.max(1, toSafeNumber(product.quantity, 1)),
      unit: product.unit || 'adet',
      estimatedShelfLifeEndDate: product.estimatedShelfLifeEndDate || '',
      kalanGun: daysLeft,
      kritikSeviye: daysLeft !== null && daysLeft <= 0 ? 'acil' : 'yaklasiyor',
    })
  }

  sanitizeProductList(urgentProducts).forEach((product) => {
    const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
    pushCritical(product, daysLeft)
  })

  sanitizeProductList(pantryStock).forEach((product) => {
    const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
    if (daysLeft !== null && daysLeft <= 2) {
      pushCritical(product, daysLeft)
    }
  })

  return Array.from(criticalMap.values())
}

const createFallbackRecipes = ({ criticalProducts, pantryStock, budgetProfile }) => {
  const stockPool = sanitizeProductList(pantryStock)
  const criticalPool = Array.isArray(criticalProducts) ? criticalProducts : []
  const profile = BUDGET_PROFILES[normalizeBudgetProfile(budgetProfile)]

  const resolveCoreIngredient = (index) => {
    if (criticalPool.length > 0) {
      return criticalPool[index % criticalPool.length]
    }

    if (stockPool.length > 0) {
      return stockPool[index % stockPool.length]
    }

    return {
      name: 'sebze karisimi',
      quantity: 1,
      unit: 'porsiyon',
      estimatedShelfLifeEndDate: '',
      kalanGun: null,
      kritikSeviye: 'yaklasiyor',
    }
  }

  const resolveSupportIngredient = (index) => {
    if (stockPool.length > 0) {
      return stockPool[(index + 1) % stockPool.length]
    }

    return {
      name: 'domates',
      quantity: 2,
      unit: 'adet',
      estimatedShelfLifeEndDate: '',
    }
  }

  const templates = [
    {
      nameSuffix: 'Ile Pratik Tava',
      description: 'Tek tavada hizli pisirme ile kritik urunleri degerlendirir.',
      staples: [
        { name: 'zeytinyagi', baseAmount: 1, unit: 'yemek kasigi' },
        { name: 'karabiber', baseAmount: 0.25, unit: 'tatli kasigi' },
      ],
    },
    {
      nameSuffix: 'Omlet Kasesi',
      description: 'Kahvalti ve aksam icin uygun, ekonomik bir secenek.',
      staples: [
        { name: 'yumurta', baseAmount: 2, unit: 'adet' },
        { name: 'tuz', baseAmount: 0.2, unit: 'tatli kasigi' },
      ],
    },
    {
      nameSuffix: 'Firinda Bowl',
      description: 'Firinda bol porsiyon cikararak israfi azaltir.',
      staples: [
        { name: 'yogurt', baseAmount: 0.2, unit: 'litre' },
        { name: 'pul biber', baseAmount: 0.15, unit: 'tatli kasigi' },
      ],
    },
  ]

  return templates.map((template, index) => {
    const core = resolveCoreIngredient(index)
    const support = resolveSupportIngredient(index)

    return {
      tarifAdi: `${core.name} ${template.nameSuffix}`,
      kisaAciklama: template.description,
      tahminiPorsiyonBasiMaliyet: profile.recipeCostLabel,
      malzemeler: [
        {
          name: core.name,
          baseAmount: core.unit === 'adet' ? 1 : 150,
          unit: core.unit === 'adet' ? 'adet' : 'gram',
        },
        {
          name: support.name,
          baseAmount: support.unit === 'adet' ? 1 : 80,
          unit: support.unit === 'adet' ? 'adet' : 'gram',
        },
        ...template.staples,
      ],
    }
  })
}

const buildAnalyzeInventoryTool = () =>
  new DynamicTool({
    name: 'AnalyzeInventoryTool',
    description:
      'Buzdolabi JSON verisini analiz eder ve raf omru kritik urunleri listeler. Input JSON: { pantryStock: Product[], urgentProducts: Product[] }',
    func: async (rawInput) => {
      const payload = safeParseJson(rawInput)
      const criticalProducts = buildCriticalProducts({
        pantryStock: payload?.pantryStock,
        urgentProducts: payload?.urgentProducts,
      })

      const result = {
        kritikUrunler: criticalProducts,
        kritikUrunSayisi: criticalProducts.length,
      }

      return JSON.stringify(result)
    },
  })

const buildCalculateSavingsTool = () =>
  new DynamicTool({
    name: 'CalculateSavingsTool',
    description:
      'Butce profiline gore disaridan siparis maliyeti ile evde yapma maliyetini karsilastirir. Input JSON: { budgetProfile: string, criticalProducts: Product[] }',
    func: async (rawInput) => {
      const payload = safeParseJson(rawInput)
      const normalizedProfile = normalizeBudgetProfile(payload?.budgetProfile)
      const profileCosts = BUDGET_PROFILES[normalizedProfile]
      const criticalCount = Array.isArray(payload?.criticalProducts)
        ? payload.criticalProducts.length
        : 0

      const mealCount = clamp(criticalCount || 2, 1, 6)
      const disaridaYemeMaliyeti = profileCosts.outsideOrderCost * mealCount
      const evdeYapmaMaliyeti = profileCosts.homeCookCost * mealCount
      const tasarrufEdilenTutar = Math.max(disaridaYemeMaliyeti - evdeYapmaMaliyeti, 0)

      const result = {
        budgetProfile: normalizedProfile,
        mealCount,
        disaridaYemeMaliyeti,
        evdeYapmaMaliyeti,
        tasarrufEdilenTutar,
      }

      return JSON.stringify(result)
    },
  })

const buildGenerateRecipeTool = () =>
  new DynamicTool({
    name: 'GenerateRecipeTool',
    description:
      'Kritik urunleri baz alip 3 porsiyonlanabilir tarif dondurur. Input JSON: { budgetProfile: string, criticalProducts: Product[], pantryStock: Product[] }',
    func: async (rawInput) => {
      const payload = safeParseJson(rawInput)
      const recipes = createFallbackRecipes({
        criticalProducts: Array.isArray(payload?.criticalProducts) ? payload.criticalProducts : [],
        pantryStock: sanitizeProductList(payload?.pantryStock),
        budgetProfile: payload?.budgetProfile,
      })

      return JSON.stringify({ tarifler: recipes })
    },
  })

const extractJsonFromText = (rawText) => {
  const value = String(rawText ?? '').trim()
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    const firstBrace = value.indexOf('{')
    const lastBrace = value.lastIndexOf('}')

    if (firstBrace < 0 || lastBrace < 0 || lastBrace <= firstBrace) {
      return null
    }

    const candidate = value.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(candidate)
    } catch {
      return null
    }
  }
}

const normalizeIngredient = (ingredient) => ({
  name: String(ingredient?.name ?? ingredient?.isim ?? '').trim(),
  baseAmount: toSafeNumber(ingredient?.baseAmount ?? ingredient?.bazMiktar, 0),
  unit: String(ingredient?.unit ?? ingredient?.birim ?? '').trim(),
})

const normalizeRecipe = (recipe) => {
  const ingredients = (Array.isArray(recipe?.malzemeler) ? recipe.malzemeler : [])
    .map(normalizeIngredient)
    .filter((ingredient) => ingredient.name && ingredient.unit && ingredient.baseAmount > 0)

  return {
    tarifAdi: String(recipe?.tarifAdi ?? '').trim(),
    kisaAciklama: String(recipe?.kisaAciklama ?? '').trim(),
    tahminiPorsiyonBasiMaliyet: String(recipe?.tahminiPorsiyonBasiMaliyet ?? '').trim(),
    malzemeler: ingredients,
  }
}

const normalizeStructuredResponse = ({ parsedResult, inputPayload }) => {
  const parsedRecipes = (Array.isArray(parsedResult?.tarifler) ? parsedResult.tarifler : [])
    .map(normalizeRecipe)
    .filter(
      (recipe) =>
        recipe.tarifAdi &&
        recipe.kisaAciklama &&
        recipe.tahminiPorsiyonBasiMaliyet &&
        recipe.malzemeler.length > 0,
    )

  const fallbackRecipes = createFallbackRecipes({
    criticalProducts: buildCriticalProducts({
      pantryStock: inputPayload.pantryStock,
      urgentProducts: inputPayload.urgentProducts,
    }),
    pantryStock: inputPayload.pantryStock,
    budgetProfile: inputPayload.budgetProfile,
  })

  const mergedRecipes = [...parsedRecipes]
  while (mergedRecipes.length < 3) {
    mergedRecipes.push(fallbackRecipes[mergedRecipes.length])
  }

  const finalRecipes = mergedRecipes.slice(0, 3)

  const criticalCount = buildCriticalProducts({
    pantryStock: inputPayload.pantryStock,
    urgentProducts: inputPayload.urgentProducts,
  }).length
  const profileCosts = BUDGET_PROFILES[normalizeBudgetProfile(inputPayload.budgetProfile)]
  const inferredMealCount = clamp(criticalCount || 2, 1, 6)
  const inferredSavings = Math.max(
    profileCosts.outsideOrderCost * inferredMealCount -
      profileCosts.homeCookCost * inferredMealCount,
    0,
  )

  const tasarrufEdilenTutar = Math.max(
    0,
    Math.round(toSafeNumber(parsedResult?.tasarrufEdilenTutar, inferredSavings)),
  )

  const defaultAgentMessage = `Kritik urunleri bozulmadan kullanarak yaklasik ${tasarrufEdilenTutar} TL tasarruf ettiniz.`
  const ajanMesaji =
    String(parsedResult?.ajanMesaji ?? '').trim() ||
    defaultAgentMessage

  return {
    tarifler: finalRecipes,
    tasarrufEdilenTutar,
    ajanMesaji,
  }
}

export const executeKapyaAgent = async ({ budgetProfile, pantryStock, urgentProducts }) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    const missingKeyError = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    missingKeyError.statusCode = 500
    throw missingKeyError
  }

  const inputPayload = {
    budgetProfile: normalizeBudgetProfile(budgetProfile),
    pantryStock: sanitizeProductList(pantryStock),
    urgentProducts: sanitizeProductList(urgentProducts),
  }

  const llm = new ChatGoogleGenerativeAI({
    apiKey,
    model: MODEL_NAME,
    temperature: 0.2,
  })

  const tools = [
    buildAnalyzeInventoryTool(),
    buildCalculateSavingsTool(),
    buildGenerateRecipeTool(),
  ]

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    [
      'system',
      [
        'Mutlaka sirayla AnalyzeInventoryTool -> CalculateSavingsTool -> GenerateRecipeTool kullan.',
        'Ardindan sadece gecerli JSON dondur; markdown veya baska metin dondurme.',
        'JSON semasi:',
        '{',
        '  "tarifler": [',
        '    {',
        '      "tarifAdi": "string",',
        '      "kisaAciklama": "string",',
        '      "tahminiPorsiyonBasiMaliyet": "string",',
        '      "malzemeler": [',
        '        { "name": "string", "baseAmount": number, "unit": "string" }',
        '      ]',
        '    }',
        '  ],',
        '  "tasarrufEdilenTutar": number,',
        '  "ajanMesaji": "string"',
        '}',
        'tarifler dizisinde tam olarak 3 tarif olmalidir.',
      ].join('\n'),
    ],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ])

  const agent = await createToolCallingAgent({
    llm,
    tools,
    prompt,
  })

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
  })

  console.log('[kapya-agent] request', inputPayload)

  let result
  try {
    result = await agentExecutor.invoke({
      input: JSON.stringify(inputPayload),
    })
  } catch {
    const providerError = new Error('Kapya ajanindan gecerli yanit alinamadi.')
    providerError.statusCode = 502
    throw providerError
  }

  const parsedResult = extractJsonFromText(result?.output)
  if (!parsedResult) {
    const parsingError = new Error('Kapya ajani gecerli JSON dondurmedi.')
    parsingError.statusCode = 502
    throw parsingError
  }

  const normalizedResponse = normalizeStructuredResponse({
    parsedResult,
    inputPayload,
  })

  console.log('[kapya-agent] structured-response', normalizedResponse)

  return normalizedResponse
}
