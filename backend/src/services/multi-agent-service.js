import { GoogleGenAI } from '@google/genai'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'

const MODEL_NAME = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-pro'

const getApiKey = () => {
  const key = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  if (!key) {
    const err = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    err.statusCode = 500
    throw err
  }
  return key
}

// ── JSON Schemas (strict) ────────────────────────────────────────────────────

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

// ── LangGraph State ──────────────────────────────────────────────────────────

const AgentState = Annotation.Root({
  agentType: Annotation({ reducer: (_, b) => b, default: () => '' }),
  payload: Annotation({ reducer: (_, b) => b, default: () => ({}) }),
  userContext: Annotation({ reducer: (_, b) => b, default: () => ({}) }),
  result: Annotation({ reducer: (prev, next) => (next === undefined ? prev : next), default: () => null }),
})

// ── Shared Gemini call helper ────────────────────────────────────────────────

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

// ── Node 1: ChefAgent ────────────────────────────────────────────────────────
// Handles gastronomic rules and recipe generation.
// (Main recipe generation is handled by agentService.js; this node is the
//  LangGraph representation of that responsibility.)

async function chefAgentNode(state) {
  const { payload, userContext } = state
  const prompt = [
    'Sen sadece gastronomik kurallara hakim bir sef ajanisın (ChefAgent).',
    `Kullanici gecmisi: ${JSON.stringify(userContext)}`,
    `Talep: ${JSON.stringify(payload)}`,
    'Gecmiste pisirilen tarifleri tekrar onerme. Sadece JSON don.',
  ].join('\n')

  const result = await callGemini({
    prompt,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        _reasoning: { type: 'string' },
        suggestion: { type: 'string' },
      },
      required: ['_reasoning', 'suggestion'],
    },
  })
  return { result }
}

// ── Node 2: DietitianAgent ───────────────────────────────────────────────────
// Analyses planned meals, returns macro/calorie weekly health summary.

async function dietitianAgentNode(state) {
  const { payload, userContext } = state
  const { plannedMeals = [] } = payload

  const mealSummary = plannedMeals
    .map((m) => `${m.date} ${m.mealType}: ${m.recipe?.tarifAdi ?? 'Bilinmeyen'} (${m.portionSize} kisi)`)
    .join('\n')

  const prompt = [
    'Sen bir DietitianAgent (Diyetisyen Ajani) olarak calisiyorsun.',
    'Kullanicinin haftalik yemek planini analiz et ve makro/kalori ozeti cikart.',
    'Gecmiste kacirilan veya sevilen yemekleri baz al.',
    '',
    `Kullanici davranis gecmisi: ${JSON.stringify(userContext)}`,
    `Haftalik plan:\n${mealSummary || 'Plan bos.'}`,
    '',
    'Ortalama bir Turk yemegi icin yaklasik degerler kullan (menemen ~320kcal, mercimek corbasi ~280kcal, vs.).',
    'healthScore: 0-100 araliginda bir puan. Cesitlilik ve denge iyi puan verir.',
    '_reasoning: Analizini bu alana yaz (UI\'a gonderilmez).',
    'Sadece talep edilen JSON formatinda donn.',
  ].join('\n')

  const result = await callGemini({ prompt, schema: dietitianSchema })
  return { result }
}

// ── Node 3: FinanceAgent ─────────────────────────────────────────────────────
// Calculates meal cost, waste loss, and savings from pantry + behavior data.

async function financeAgentNode(state) {
  const { payload, userContext } = state
  const { pantryProducts = [], financeData = {} } = payload

  const prompt = [
    'Sen bir FinanceAgent (Finans Ajani) olarak calisiyorsun.',
    'Mutfak harcamalarini, israf zararini ve tasarruf potansiyelini hesapla.',
    '',
    `Kullanici israf gecmisi: ${JSON.stringify(userContext.wastedIngredients ?? [])}`,
    `Kiler stogu (urun, miktar, birim, birimMaliyet): ${JSON.stringify(pantryProducts.slice(0, 30))}`,
    `Mevcut finans verisi: ${JSON.stringify(financeData)}`,
    '',
    'savedBalance: Bu ayki onlenen israf TL degeri (financeData.monthlyPreventedWaste icindeki bu ayin degeri).',
    'wasteLoss: israf edilen malzemelerin tahmini TL kaybi.',
    'avgMealCost: Kiler stogu uzerinden hesaplanan ortalama ogün maliyeti TL.',
    'topWastedIngredient: En cok israf edilen malzeme adi (bos string olabilir).',
    'savingTip: Tek cumle, spesifik bir tasarruf onerisi.',
    '_reasoning: Hesaplama adimlarini bu alana yaz (UI\'a gonderilmez).',
    'Sadece JSON donn.',
  ].join('\n')

  const result = await callGemini({ prompt, schema: financeSchema })
  return { result }
}

// ── Router ───────────────────────────────────────────────────────────────────

function routerNode(state) {
  const type = String(state.agentType ?? '').toLowerCase()
  if (type === 'dietitian') return 'dietitian'
  if (type === 'finance') return 'finance'
  return 'chef'
}

// ── Build & compile graph ────────────────────────────────────────────────────

const kapyaAgentGraph = new StateGraph(AgentState)
  .addNode('chef', chefAgentNode)
  .addNode('dietitian', dietitianAgentNode)
  .addNode('finance', financeAgentNode)
  .addConditionalEdges(START, routerNode, {
    chef: 'chef',
    dietitian: 'dietitian',
    finance: 'finance',
  })
  .addEdge('chef', END)
  .addEdge('dietitian', END)
  .addEdge('finance', END)
  .compile()

// ── Public API ───────────────────────────────────────────────────────────────

export async function runDietitianAgent({ plannedMeals, userContext }) {
  const state = await kapyaAgentGraph.invoke({
    agentType: 'dietitian',
    payload: { plannedMeals: Array.isArray(plannedMeals) ? plannedMeals : [] },
    userContext: userContext && typeof userContext === 'object' ? userContext : {},
  })
  return state.result
}

export async function runFinanceAgent({ pantryProducts, financeData, userContext }) {
  const state = await kapyaAgentGraph.invoke({
    agentType: 'finance',
    payload: {
      pantryProducts: Array.isArray(pantryProducts) ? pantryProducts : [],
      financeData: financeData && typeof financeData === 'object' ? financeData : {},
    },
    userContext: userContext && typeof userContext === 'object' ? userContext : {},
  })
  return state.result
}
