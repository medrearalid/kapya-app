import { createHash } from 'node:crypto'
import { Redis } from '@upstash/redis'

const DEFAULT_RECIPE_CACHE_TTL_SECONDS = 60 * 60 * 6
const DEFAULT_INSIGHT_CACHE_TTL_SECONDS = 60 * 30
const DEFAULT_REDIS_TIMEOUT_MS = 900
const HASH_ALGORITHM = 'sha256'
const RECIPE_CACHE_PREFIX = 'recipe_cache'
const INSIGHT_CACHE_PREFIX = 'insight_cache'

let cachedRedisClient

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')

const normalizeNumeric = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Number(parsed.toFixed(6))
}

const normalizeStringList = (values) =>
  Array.from(
    new Set((Array.isArray(values) ? values : []).map((item) => normalizeText(item)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, 'tr'))

const normalizeProductList = (products) =>
  (Array.isArray(products) ? products : [])
    .map((product) => ({
      name: normalizeText(product?.name ?? product?.urunAdi),
      quantity: normalizeNumeric(product?.quantity ?? product?.miktar, 0),
      unit: normalizeText(product?.unit ?? product?.birim ?? 'adet') || 'adet',
    }))
    .filter((product) => product.name)
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, 'tr') ||
        left.unit.localeCompare(right.unit, 'tr') ||
        left.quantity - right.quantity,
    )

const normalizeGuidedContext = (guidedContext) => {
  if (!guidedContext || typeof guidedContext !== 'object' || Array.isArray(guidedContext)) {
    return {
      category: '',
      cookingTechnique: '',
      dietGoal: '',
      focusIngredients: [],
    }
  }

  const mergedFocusIngredients = [
    ...(Array.isArray(guidedContext?.focusIngredients) ? guidedContext.focusIngredients : []),
    ...(Array.isArray(guidedContext?.focusedIngredients) ? guidedContext.focusedIngredients : []),
  ]

  return {
    category: normalizeText(guidedContext?.category),
    cookingTechnique: normalizeText(guidedContext?.cookingTechnique),
    dietGoal: normalizeText(guidedContext?.dietGoal),
    focusIngredients: normalizeStringList(mergedFocusIngredients),
  }
}

const stableSortDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => stableSortDeep(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableSortDeep(nestedValue)]),
    )
  }

  if (typeof value === 'string') {
    return normalizeText(value)
  }

  if (typeof value === 'number') {
    return normalizeNumeric(value)
  }

  return value
}

const toStableJson = (payload) => JSON.stringify(stableSortDeep(payload))

const resolveTimeoutMs = () => {
  const parsed = Number(process.env.SEMANTIC_CACHE_REDIS_TIMEOUT_MS)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REDIS_TIMEOUT_MS
  }

  return Math.floor(parsed)
}

const resolveTtlSeconds = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}

const withTimeout = async (promise, timeoutMs) => {
  const boundedTimeoutMs = Number(timeoutMs)
  if (!Number.isFinite(boundedTimeoutMs) || boundedTimeoutMs <= 0) {
    return promise
  }

  let timeoutId

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = new Error('Semantic cache request timed out.')
          timeoutError.code = 'ETIMEDOUT'
          reject(timeoutError)
        }, boundedTimeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

const getRedisClient = () => {
  if (cachedRedisClient !== undefined) {
    return cachedRedisClient
  }

  const url = String(process.env.UPSTASH_REDIS_REST_URL ?? '').trim()
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN ?? '').trim()

  if (!url || !token) {
    cachedRedisClient = null
    return cachedRedisClient
  }

  cachedRedisClient = new Redis({
    url,
    token,
  })

  return cachedRedisClient
}

const logCacheWarning = (phase, key, error) => {
  console.warn(`[semantic-cache] ${phase} bypass`, {
    key,
    message: String(error?.message ?? error),
  })
}

const buildCacheKeyFromPayload = ({ prefix, payload }) => {
  const stableJson = toStableJson(payload)
  const hash = createHash(HASH_ALGORITHM).update(stableJson).digest('hex')
  return `${prefix}:${hash}`
}

export const buildRecipeSemanticCacheKey = ({
  mode,
  budgetProfile,
  pantryStock,
  urgentProducts,
  dishCategory,
  mealType,
  mealName,
  focusedIngredients,
  preferences,
  guidedContext,
  requestMode,
  agentInstruction,
  recentRecipeNames,
}) => {
  const normalizedGuidedContext = normalizeGuidedContext(guidedContext)
  const normalizedFocusedIngredients = normalizeStringList([
    ...(Array.isArray(focusedIngredients) ? focusedIngredients : []),
    ...normalizedGuidedContext.focusIngredients,
  ])

  const normalizedPayload = {
    version: 1,
    mode: normalizeText(mode),
    budgetProfile: normalizeText(budgetProfile),
    pantryStock: normalizeProductList(pantryStock),
    urgentProducts: normalizeProductList(urgentProducts),
    category: normalizeText(dishCategory),
    mealType: normalizeText(mealType),
    mealName: normalizeText(mealName),
    filters: {
      requestMode: normalizeText(requestMode),
      agentInstruction: normalizeText(agentInstruction),
      focusedIngredients: normalizedFocusedIngredients,
      preferences: normalizeStringList(preferences),
      guidedContext: normalizedGuidedContext,
      recentRecipeNames: normalizeStringList(recentRecipeNames),
    },
  }

  return buildCacheKeyFromPayload({
    prefix: RECIPE_CACHE_PREFIX,
    payload: normalizedPayload,
  })
}

const normalizeInsightPlanFacts = (planFacts) =>
  (Array.isArray(planFacts) ? planFacts : [])
    .map((fact) => ({
      date: normalizeText(fact?.date),
      mealType: normalizeText(fact?.mealType),
      recipeName: normalizeText(fact?.recipeName),
      portionSize: normalizeNumeric(fact?.portionSize, 0),
      kaloriNote: normalizeText(fact?.kaloriNote),
    }))
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date, 'tr') ||
        left.mealType.localeCompare(right.mealType, 'tr') ||
        left.recipeName.localeCompare(right.recipeName, 'tr'),
    )

export const buildInsightSemanticCacheKey = ({ trigger, knowledgeBase }) => {
  const normalizedPayload = {
    version: 1,
    trigger: normalizeText(trigger),
    monthKey: normalizeText(knowledgeBase?.monthKey),
    pantryFacts: normalizeProductList(knowledgeBase?.pantryFacts),
    planFacts: normalizeInsightPlanFacts(knowledgeBase?.planFacts),
    financeFacts: {
      thisMonthSpend: normalizeNumeric(knowledgeBase?.financeFacts?.thisMonthSpend, 0),
      thisMonthPreventedWaste: normalizeNumeric(knowledgeBase?.financeFacts?.thisMonthPreventedWaste, 0),
    },
    behaviorFacts: {
      cookedRecipes: normalizeStringList(knowledgeBase?.behaviorFacts?.cookedRecipes),
      swipedRecipes: normalizeStringList(knowledgeBase?.behaviorFacts?.swipedRecipes),
      wastedIngredients: normalizeStringList(knowledgeBase?.behaviorFacts?.wastedIngredients),
    },
  }

  return buildCacheKeyFromPayload({
    prefix: INSIGHT_CACHE_PREFIX,
    payload: normalizedPayload,
  })
}

export const readSemanticCacheJson = async ({ key }) => {
  const redisClient = getRedisClient()
  if (!redisClient || !key) {
    return null
  }

  try {
    const cachedValue = await withTimeout(redisClient.get(key), resolveTimeoutMs())
    if (cachedValue === null || cachedValue === undefined) {
      return null
    }

    if (typeof cachedValue === 'string') {
      return JSON.parse(cachedValue)
    }

    return cachedValue
  } catch (error) {
    logCacheWarning('read', key, error)
    return null
  }
}

export const writeSemanticCacheJson = ({ key, value, ttlSeconds }) => {
  const redisClient = getRedisClient()
  if (!redisClient || !key || value === undefined) {
    return
  }

  const recipeTtl = resolveTtlSeconds(
    process.env.SEMANTIC_CACHE_TTL_SECONDS,
    DEFAULT_RECIPE_CACHE_TTL_SECONDS,
  )
  const insightTtl = resolveTtlSeconds(
    process.env.INSIGHT_CACHE_TTL_SECONDS,
    DEFAULT_INSIGHT_CACHE_TTL_SECONDS,
  )
  const fallbackTtl = key.startsWith(RECIPE_CACHE_PREFIX) ? recipeTtl : insightTtl
  const boundedTtlSeconds = resolveTtlSeconds(ttlSeconds, fallbackTtl)

  withTimeout(redisClient.set(key, value, { ex: boundedTtlSeconds }), resolveTimeoutMs()).catch((error) => {
    logCacheWarning('write', key, error)
  })
}

export const isSemanticCacheAvailable = () => Boolean(getRedisClient())
