import { GoogleGenAI } from '@google/genai'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'

const MODEL_NAME = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-pro'
const MAX_RETRIES = 1
const CURRENT_MONTH_KEY = () => new Date().toISOString().slice(0, 7)

const getApiKey = () => {
  const key = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  if (!key) {
    const err = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    err.statusCode = 500
    throw err
  }
  return key
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
  workerType: Annotation({ reducer: (_, b) => b, default: () => '' }),
  result: Annotation({ reducer: (_, b) => b, default: () => null }),
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  validationError: Annotation({ reducer: (_, b) => b, default: () => null }),
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

function supervisorNode(state) {
  const trigger = String(state.knowledgeBase?.trigger ?? '').toLowerCase()
  const workerType = (trigger === 'wallet_page' || trigger === 'finance') ? 'finance' : 'dietitian'
  return { workerType }
}

function supervisorRouter(state) {
  return state.workerType
}

// ── 6. Worker Nodes ──────────────────────────────────────────────────────────

async function dietitianWorkerNode(state) {
  const { knowledgeBase, validationError, retryCount } = state
  const { planFacts, behaviorFacts } = knowledgeBase
  const mealLines = planFacts.length
    ? planFacts.map((m) => `${m.date} ${m.mealType}: ${m.recipeName} (${m.portionSize} kisi${m.kaloriNote ? ', ' + m.kaloriNote : ''})`).join('\n')
    : 'Plan bos.'
  const correctionLine = validationError && retryCount > 0
    ? `[DUZELTME] Onceki ciktin hataliydı: "${validationError}". Degerler bilimsel aralikta olmali.`
    : ''

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
    return { result }
  } catch {
    return { result: null }
  }
}

async function financeWorkerNode(state) {
  const { knowledgeBase, validationError, retryCount } = state
  const { pantryFacts, financeFacts, behaviorFacts } = knowledgeBase
  const correctionLine = validationError && retryCount > 0
    ? `[DUZELTME] Onceki ciktin hataliydı: "${validationError}". Negatif deger kullanma.`
    : ''

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
    return { result }
  } catch {
    return { result: null }
  }
}

// ── 7. Validator Node (Self-Correction Loop) ─────────────────────────────────

function validatorNode(state) {
  const { result, workerType, retryCount } = state
  if (!result || typeof result !== 'object') {
    return { validationError: 'Ajan gecerli sonuc dondurmedi.', retryCount: retryCount + 1 }
  }

  if (workerType === 'dietitian') {
    const cal = Number(result.avgDailyCalorie)
    const score = Number(result.healthScore)
    if (!Number.isFinite(cal) || cal < 50 || cal > 8000) {
      return { validationError: `avgDailyCalorie gecersiz: ${cal}`, retryCount: retryCount + 1 }
    }
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return { validationError: `healthScore gecersiz: ${score}`, retryCount: retryCount + 1 }
    }
    if (Number(result.avgDailyProtein) < 0 || Number(result.avgDailyCarb) < 0 || Number(result.avgDailyFat) < 0) {
      return { validationError: 'Makro degerler negatif olamaz.', retryCount: retryCount + 1 }
    }
  }

  if (workerType === 'finance') {
    const saved = Number(result.savedBalance)
    const waste = Number(result.wasteLoss)
    const avg = Number(result.avgMealCost)
    if (!Number.isFinite(saved) || saved < 0) {
      return { validationError: `savedBalance negatif/gecersiz: ${saved}`, retryCount: retryCount + 1 }
    }
    if (!Number.isFinite(waste) || waste < 0) {
      return { validationError: `wasteLoss negatif/gecersiz: ${waste}`, retryCount: retryCount + 1 }
    }
    if (!Number.isFinite(avg) || avg < 0 || avg > 10000) {
      return { validationError: `avgMealCost aralik disi: ${avg}`, retryCount: retryCount + 1 }
    }
  }

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

export async function runInsightAgent({ trigger, plannedMeals, pantryProducts, financeData, userContext }) {
  const knowledgeBase = buildKnowledgeBase({ trigger, plannedMeals, pantryProducts, financeData, userContext })
  const state = await kapyaGraph.invoke({ knowledgeBase })
  return state.result
}

// Backwards-compatible exports
export const runDietitianAgent = ({ plannedMeals, userContext }) =>
  runInsightAgent({ trigger: 'planner_page', plannedMeals, userContext })

export const runFinanceAgent = ({ pantryProducts, financeData, userContext }) =>
  runInsightAgent({ trigger: 'wallet_page', pantryProducts, financeData, userContext })
