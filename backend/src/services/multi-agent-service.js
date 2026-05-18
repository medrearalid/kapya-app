import { AsyncLocalStorage } from 'node:async_hooks'
import { GoogleGenAI } from '@google/genai'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import {
  buildInsightSemanticCacheKey,
  readSemanticCacheJson,
  writeSemanticCacheJson,
} from './semantic-cache-service.js'

// Per-request emit context — thread-safe via AsyncLocalStorage
const emitterStorage = new AsyncLocalStorage()
const emitLog = (message) => emitterStorage.getStore()?.(message)

const MODEL_NAME = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-pro'
const MAX_RETRIES = 1
const NODE_DELAY_MS = 1500
const CURRENT_MONTH_KEY = () => new Date().toISOString().slice(0, 7)

const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  developerMode: false,
  artificialDelayMs: 0,
  forceDietitianConflict: false,
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeRuntimeConfig = (developerMode) => {
  if (developerMode === true) {
    return {
      developerMode: true,
      artificialDelayMs: NODE_DELAY_MS,
      forceDietitianConflict: true,
    }
  }

  return { ...DEFAULT_RUNTIME_CONFIG }
}

const isDeveloperMode = (state) => state?.runtime?.developerMode === true

const emitStageLog = (state, normalMessage, developerMessage = normalMessage) => {
  const selectedMessage = isDeveloperMode(state) ? developerMessage : normalMessage
  const text = String(selectedMessage ?? '').trim()
  if (text) {
    emitLog(text)
  }
}

const waitForNodeDelay = async (state, nodeName) => {
  const delayMs = Number(state?.runtime?.artificialDelayMs) || 0
  if (delayMs <= 0) {
    return
  }

  emitLog(`[latency] ${nodeName} sleep=${delayMs}ms`)
  await sleep(delayMs)
}

const getApiKey = () => {
  const key = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  if (!key) {
    const err = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    err.statusCode = 500
    throw err
  }
  return key
}

const resolveCachedInsightResult = async (cacheKey) => {
  if (!cacheKey) {
    return null
  }

  const cachedValue = await readSemanticCacheJson({ key: cacheKey })
  if (!cachedValue || typeof cachedValue !== 'object' || Array.isArray(cachedValue)) {
    return null
  }

  return cachedValue
}

// ── 1. Knowledge Base Builder ────────────────────────────────────────────────
// All agents MUST query this KB before reasoning — no raw data in prompts.

export function buildKnowledgeBase({ trigger, plannedMeals, pantryProducts, financeData, userContext }) {
  const monthKey = CURRENT_MONTH_KEY()
  return {
    trigger: String(trigger ?? '').trim(),
    monthKey,
    pantryFacts: (Array.isArray(pantryProducts) ? pantryProducts : [])
      .filter((p) => p?.name)
      .slice(0, 30)
      .map((p) => ({
        name: String(p.name).trim(),
        quantity: Number(p.quantity) || 0,
        unit: String(p.unit || 'adet').trim(),
        birimMaliyet: Number(p.birimMaliyet) || 0,
      })),
    financeFacts: {
      thisMonthSpend: Number(financeData?.monthlyKitchenSpend?.[monthKey]) || 0,
      thisMonthPreventedWaste: Number(financeData?.monthlyPreventedWaste?.[monthKey]) || 0,
    },
    planFacts: (Array.isArray(plannedMeals) ? plannedMeals : []).map((m) => ({
      date: String(m.date ?? ''),
      mealType: String(m.mealType ?? ''),
      recipeName: String(m.recipe?.tarifAdi ?? 'Bilinmeyen'),
      portionSize: Number(m.portionSize) || 1,
      kaloriNote: String(m.recipe?.ortalamaKalori ?? ''),
    })),
    behaviorFacts: {
      cookedRecipes: (Array.isArray(userContext?.cookedRecipes) ? userContext.cookedRecipes : []).slice(0, 10),
      swipedRecipes: (Array.isArray(userContext?.swipedRecipes) ? userContext.swipedRecipes : []).slice(0, 10),
      wastedIngredients: (Array.isArray(userContext?.wastedIngredients) ? userContext.wastedIngredients : []).slice(0, 10),
    },
  }
}

// ── 2. Strict Output Schemas ─────────────────────────────────────────────────

const dietitianSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    _reasoning: { type: 'string' },
    avgDailyCalorie: { type: 'number' },
    avgDailyProtein: { type: 'number' },
    avgDailyCarb: { type: 'number' },
    avgDailyFat: { type: 'number' },
    calorieGoal: { type: 'number' },
    proteinGoal: { type: 'number' },
    healthScore: { type: 'number' },
    insight: { type: 'string' },
  },
  required: ['_reasoning', 'avgDailyCalorie', 'avgDailyProtein', 'avgDailyCarb', 'avgDailyFat', 'calorieGoal', 'proteinGoal', 'healthScore', 'insight'],
}

const financeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    _reasoning: { type: 'string' },
    savedBalance: { type: 'number' },
    wasteLoss: { type: 'number' },
    avgMealCost: { type: 'number' },
    topWastedIngredient: { type: 'string' },
    savingTip: { type: 'string' },
  },
  required: ['_reasoning', 'savedBalance', 'wasteLoss', 'avgMealCost', 'topWastedIngredient', 'savingTip'],
}

// ── 3. LangGraph State ───────────────────────────────────────────────────────

const KapyaState = Annotation.Root({
  knowledgeBase: Annotation({ reducer: (_, b) => b, default: () => ({}) }),
  runtime: Annotation({ reducer: (_, b) => b, default: () => ({ ...DEFAULT_RUNTIME_CONFIG }) }),
  workerType: Annotation({ reducer: (_, b) => b, default: () => '' }),
  result: Annotation({ reducer: (_, b) => b, default: () => null }),
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  validationError: Annotation({ reducer: (_, b) => b, default: () => null }),
  forcedConflictInjected: Annotation({ reducer: (_, b) => b, default: () => false }),
})

// ── 4. Gemini call helper ────────────────────────────────────────────────────

async function callGemini({ prompt, schema }) {
  const ai = new GoogleGenAI({ apiKey: getApiKey() })
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    },
  })
  const text = String(response.text ?? '').trim()
  return JSON.parse(text)
}

// ── 5. Supervisor Node ───────────────────────────────────────────────────────
// Reads the KB trigger and dispatches to the correct worker. No LLM call here.

async function supervisorNode(state) {
  await waitForNodeDelay(state, 'supervisor')

  const trigger = String(state.knowledgeBase?.trigger ?? '').toLowerCase()
  const workerType = (trigger === 'wallet_page' || trigger === 'finance') ? 'finance' : 'dietitian'

  emitStageLog(
    state,
    'Mutfak stoklari analiz ediliyor...',
    `[supervisor] trigger=${trigger || 'unknown'} planFacts=${state.knowledgeBase?.planFacts?.length || 0} pantryFacts=${state.knowledgeBase?.pantryFacts?.length || 0}`,
  )
  emitStageLog(
    state,
    workerType === 'finance' ? 'Mutfak butce dengesi hesaplanıyor...' : 'Kalori dengesi kuruluyor...',
    `[supervisor] route -> workerType=${workerType}`,
  )

  return { workerType }
}

function supervisorRouter(state) {
  return state.workerType
}

// ── 6. Worker Nodes ──────────────────────────────────────────────────────────

async function dietitianWorkerNode(state) {
  await waitForNodeDelay(state, 'dietitian')

  const { knowledgeBase, validationError, retryCount } = state
  const { planFacts, behaviorFacts } = knowledgeBase

  emitStageLog(
    state,
    'Kalori dengesi kuruluyor...',
    `[dietitian] start retry=${retryCount} validationError=${validationError || 'none'}`,
  )

  const mealLines = planFacts.length
    ? planFacts.map((m) => `${m.date} ${m.mealType}: ${m.recipeName} (${m.portionSize} kisi${m.kaloriNote ? ', ' + m.kaloriNote : ''})`).join('\n')
    : 'Plan bos.'
  const correctionLine = validationError && retryCount > 0
    ? `[DUZELTME] Onceki ciktin hataliydı: "${validationError}". Degerler bilimsel aralikta olmali.`
    : ''

  emitStageLog(
    state,
    'Beslenme dengesi son kez kontrol ediliyor...',
    `[dietitian] planFacts=${planFacts.length} cooked=${behaviorFacts.cookedRecipes.length} swiped=${behaviorFacts.swipedRecipes.length}`,
  )

  const prompt = [
    'Sen DietitianAgent olarak YALNIZCA asagidaki Knowledge Base verilerini kullaniyorsun.',
    correctionLine,
    `[KB - Haftalik Plan]:\n${mealLines}`,
    `[KB - Davranis]: Pisirilen: ${behaviorFacts.cookedRecipes.join(', ') || 'Yok'} | Kacirilan: ${behaviorFacts.swipedRecipes.join(', ') || 'Yok'}.`,
    'Turk yemegi kcal ref: menemen ~320, corba ~280, tavuk sote ~380, nohut ~350, makarna ~420.',
    'healthScore: 0-100. Plan bossa 50 ver. Cesitlilik ve sebze bolsa puan artir.',
    '_reasoning alani UI\'a gitmez, analizini oraya yaz.',
  ].filter(Boolean).join('\n')

  try {
    const result = await callGemini({ prompt, schema: dietitianSchema })

    emitStageLog(
      state,
      'Saglik metrikleri olusturuluyor...',
      `[dietitian] model-ok keys=${Object.keys(result || {}).join(',')}`,
    )

    return { result }
  } catch (error) {
    emitStageLog(
      state,
      'Saglik analizi tekrar denenecek...',
      `[dietitian] model-error=${error?.message || 'unknown'}`,
    )

    return { result: null }
  }
}

async function financeWorkerNode(state) {
  await waitForNodeDelay(state, 'finance')

  const { knowledgeBase, validationError, retryCount } = state
  const { pantryFacts, financeFacts, behaviorFacts } = knowledgeBase

  emitStageLog(
    state,
    'Mutfak butce dengesi hesaplanıyor...',
    `[finance] start retry=${retryCount} validationError=${validationError || 'none'}`,
  )

  const correctionLine = validationError && retryCount > 0
    ? `[DUZELTME] Onceki ciktin hataliydı: "${validationError}". Negatif deger kullanma.`
    : ''

  emitStageLog(
    state,
    'Tasarruf ve israf dengesi hesaplanıyor...',
    `[finance] pantryFacts=${pantryFacts.length} spend=${financeFacts.thisMonthSpend} preventedWaste=${financeFacts.thisMonthPreventedWaste} wastedIngredients=${behaviorFacts.wastedIngredients.length}`,
  )

  const prompt = [
    'Sen FinanceAgent olarak YALNIZCA asagidaki Knowledge Base verilerini kullaniyorsun.',
    correctionLine,
    `[KB - Kiler] (${pantryFacts.length} urun): ${JSON.stringify(pantryFacts)}`,
    `[KB - Bu Ay]: Harcama ${financeFacts.thisMonthSpend} TL | Onlenen Israf ${financeFacts.thisMonthPreventedWaste} TL.`,
    `[KB - Israf Gecmisi]: ${behaviorFacts.wastedIngredients.join(', ') || 'Yok'}.`,
    'savedBalance: KB\'deki thisMonthPreventedWaste degerini kullan.',
    'wasteLoss: Israf gecmisindeki malzemelerin birimMaliyet bazli tahmini TL kaybi.',
    'avgMealCost: Kiler urunlerinin toplam maliyetini urun sayisina bol. Kiler bossa 0.',
    'topWastedIngredient: En cok israf edilen malzeme (bos olabilir).',
    'savingTip: Tek cumle, spesifik tasarruf onerisi. _reasoning alani UI\'a gitmez.',
  ].filter(Boolean).join('\n')

  try {
    const result = await callGemini({ prompt, schema: financeSchema })

    emitStageLog(
      state,
      'Finans ozeti olusturuluyor...',
      `[finance] model-ok keys=${Object.keys(result || {}).join(',')}`,
    )

    return { result }
  } catch (error) {
    emitStageLog(
      state,
      'Finans analizi tekrar denenecek...',
      `[finance] model-error=${error?.message || 'unknown'}`,
    )

    return { result: null }
  }
}

// ── 7. Validator Node (Self-Correction Loop) ─────────────────────────────────

const shouldInjectDietitianConflict = ({ state, workerType, retryCount }) =>
  workerType === 'dietitian' &&
  isDeveloperMode(state) &&
  state.runtime?.forceDietitianConflict === true &&
  state.forcedConflictInjected !== true &&
  retryCount === 0

const getDietitianValidationError = (result) => {
  const cal = Number(result.avgDailyCalorie)
  const score = Number(result.healthScore)

  if (!Number.isFinite(cal) || cal < 50 || cal > 8000) {
    return `avgDailyCalorie gecersiz: ${cal}`
  }

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return `healthScore gecersiz: ${score}`
  }

  if (
    Number(result.avgDailyProtein) < 0 ||
    Number(result.avgDailyCarb) < 0 ||
    Number(result.avgDailyFat) < 0
  ) {
    return 'Makro degerler negatif olamaz.'
  }

  return ''
}

const getFinanceValidationError = (result) => {
  const saved = Number(result.savedBalance)
  const waste = Number(result.wasteLoss)
  const avg = Number(result.avgMealCost)

  if (!Number.isFinite(saved) || saved < 0) {
    return `savedBalance negatif/gecersiz: ${saved}`
  }

  if (!Number.isFinite(waste) || waste < 0) {
    return `wasteLoss negatif/gecersiz: ${waste}`
  }

  if (!Number.isFinite(avg) || avg < 0 || avg > 10000) {
    return `avgMealCost aralik disi: ${avg}`
  }

  return ''
}

async function validatorNode(state) {
  await waitForNodeDelay(state, 'validator')

  const { result, workerType, retryCount } = state

  emitStageLog(
    state,
    'Son kontrol yapiliyor...',
    `[validator] start workerType=${workerType} retryCount=${retryCount}`,
  )

  const rejectValidation = (reason, extraState = {}) => {
    emitStageLog(state, '', `[validator] reject reason=${reason}`)
    return {
      validationError: reason,
      retryCount: retryCount + 1,
      ...extraState,
    }
  }

  if (!result || typeof result !== 'object') {
    return rejectValidation('Ajan gecerli sonuc dondurmedi.')
  }

  if (shouldInjectDietitianConflict({ state, workerType, retryCount })) {
    return rejectValidation(
      'DietitianAgent REJECT chefProposal: makro dagilimi hedef araligin disinda (simulasyon).',
      { forcedConflictInjected: true },
    )
  }

  if (workerType === 'dietitian') {
    const validationError = getDietitianValidationError(result)
    if (validationError) {
      return rejectValidation(validationError)
    }
  }

  if (workerType === 'finance') {
    const validationError = getFinanceValidationError(result)
    if (validationError) {
      return rejectValidation(validationError)
    }
  }

  emitStageLog(state, 'Analiz tamamlandi.', `[validator] accept workerType=${workerType}`)
  return { validationError: null }
}

function validatorRouter(state) {
  if (state.validationError && state.retryCount <= MAX_RETRIES) {
    return state.workerType
  }
  return 'done'
}

// ── 8. Compile LangGraph ─────────────────────────────────────────────────────

const kapyaGraph = new StateGraph(KapyaState)
  .addNode('supervisor', supervisorNode)
  .addNode('dietitian', dietitianWorkerNode)
  .addNode('finance', financeWorkerNode)
  .addNode('validator', validatorNode)
  .addEdge(START, 'supervisor')
  .addConditionalEdges('supervisor', supervisorRouter, {
    dietitian: 'dietitian',
    finance: 'finance',
  })
  .addEdge('dietitian', 'validator')
  .addEdge('finance', 'validator')
  .addConditionalEdges('validator', validatorRouter, {
    dietitian: 'dietitian',
    finance: 'finance',
    done: END,
  })
  .compile()

// ── 9. Public API ─────────────────────────────────────────────────────────────

export async function runInsightAgent({ trigger, plannedMeals, pantryProducts, financeData, userContext, developerMode = false }) {
  const runtime = normalizeRuntimeConfig(developerMode)
  const knowledgeBase = buildKnowledgeBase({ trigger, plannedMeals, pantryProducts, financeData, userContext })
  const insightCacheKey = developerMode
    ? ''
    : buildInsightSemanticCacheKey({
        trigger,
        knowledgeBase,
      })

  const cachedResult = await resolveCachedInsightResult(insightCacheKey)
  if (cachedResult) {
    return cachedResult
  }

  const state = await kapyaGraph.invoke({ knowledgeBase, runtime })
  if (state?.result) {
    writeSemanticCacheJson({
      key: insightCacheKey,
      value: state.result,
    })
  }

  return state.result
}

// Streaming variant — emitFn is called with each log message in real-time.
export async function runInsightAgentStreaming(
  { trigger, plannedMeals, pantryProducts, financeData, userContext, developerMode = false },
  emitFn,
) {
  const runtime = normalizeRuntimeConfig(developerMode)
  const knowledgeBase = buildKnowledgeBase({ trigger, plannedMeals, pantryProducts, financeData, userContext })
  const insightCacheKey = developerMode
    ? ''
    : buildInsightSemanticCacheKey({
        trigger,
        knowledgeBase,
      })

  const cachedResult = await resolveCachedInsightResult(insightCacheKey)
  if (cachedResult) {
    if (typeof emitFn === 'function') {
      emitFn('Onbellekten hizli sonuc donduruldu.')
    }
    return cachedResult
  }

  const state = await emitterStorage.run(emitFn, () => kapyaGraph.invoke({ knowledgeBase, runtime }))
  if (state?.result) {
    writeSemanticCacheJson({
      key: insightCacheKey,
      value: state.result,
    })
  }

  return state.result
}

// Backwards-compatible exports
export const runDietitianAgent = ({ plannedMeals, userContext }) =>
  runInsightAgent({ trigger: 'planner_page', plannedMeals, userContext })

export const runFinanceAgent = ({ pantryProducts, financeData, userContext }) =>
  runInsightAgent({ trigger: 'wallet_page', pantryProducts, financeData, userContext })
