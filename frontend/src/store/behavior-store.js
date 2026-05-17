import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const BEHAVIOR_STORAGE_KEY = 'kapya-behavior-store'
const MAX_HISTORY_SIZE = 50
const MAX_INSIGHT_LOG_HISTORY = 45
const INSIGHT_TRIGGERS = Object.freeze(['planner_page', 'wallet_page'])

const toNormalizedName = (value) => String(value ?? '').trim()

const createEmptyInsightState = () => ({
  planner_page: {
    loading: false,
    requestKey: '',
    log: '',
    logHistory: [],
    data: null,
    error: '',
  },
  wallet_page: {
    loading: false,
    requestKey: '',
    log: '',
    logHistory: [],
    data: null,
    error: '',
  },
})

const normalizeInsightTrigger = (trigger) =>
  INSIGHT_TRIGGERS.includes(String(trigger ?? '').trim())
    ? String(trigger ?? '').trim()
    : 'wallet_page'

const addUnique = (list, item, maxSize) => {
  const name = toNormalizedName(item)
  if (!name) return list
  const filtered = list.filter((existing) => toNormalizedName(existing) !== name)
  return [name, ...filtered].slice(0, maxSize)
}

const appendInsightLog = (history, message) => {
  const normalizedMessage = toNormalizedName(message)
  if (!normalizedMessage) {
    return Array.isArray(history) ? history : []
  }

  const baseHistory = Array.isArray(history) ? history : []
  const lastMessage = toNormalizedName(baseHistory.at(-1))
  if (lastMessage === normalizedMessage) {
    return baseHistory
  }

  return [...baseHistory, normalizedMessage].slice(-MAX_INSIGHT_LOG_HISTORY)
}

export const useBehaviorStore = create(
  persist(
    (set, get) => ({
      swipedRecipes: [],
      cookedRecipes: [],
      wastedIngredients: [],
      insightByTrigger: createEmptyInsightState(),

      // Agent log state (not persisted — UI only)
      currentAgentLog: '',
      setAgentLog: (message) => set({ currentAgentLog: message }),
      clearAgentLog: () => set({ currentAgentLog: '' }),

      beginInsightStream: (trigger, requestKey) =>
        set((state) => {
          const safeTrigger = normalizeInsightTrigger(trigger)
          const normalizedRequestKey = toNormalizedName(requestKey)
          const currentInsight = state.insightByTrigger?.[safeTrigger] || {
            loading: false,
            requestKey: '',
            log: '',
            logHistory: [],
            data: null,
            error: '',
          }

          if (
            normalizedRequestKey &&
            currentInsight.requestKey === normalizedRequestKey &&
            (currentInsight.loading || currentInsight.data || currentInsight.error)
          ) {
            return state
          }

          return {
            currentAgentLog: '',
            insightByTrigger: {
              ...state.insightByTrigger,
              [safeTrigger]: {
                loading: true,
                requestKey: normalizedRequestKey,
                log: '',
                logHistory: [],
                data: null,
                error: '',
              },
            },
          }
        }),

      setInsightLog: (trigger, message) =>
        set((state) => {
          const safeTrigger = normalizeInsightTrigger(trigger)
          const currentInsight = state.insightByTrigger?.[safeTrigger] || {
            loading: false,
            requestKey: '',
            log: '',
            logHistory: [],
            data: null,
            error: '',
          }
          const normalizedMessage = toNormalizedName(message)
          const nextLogHistory = appendInsightLog(currentInsight.logHistory, normalizedMessage)

          return {
            currentAgentLog: normalizedMessage,
            insightByTrigger: {
              ...state.insightByTrigger,
              [safeTrigger]: {
                ...currentInsight,
                log: normalizedMessage,
                logHistory: nextLogHistory,
              },
            },
          }
        }),

      setInsightData: (trigger, data, requestKey) =>
        set((state) => {
          const safeTrigger = normalizeInsightTrigger(trigger)
          const currentInsight = state.insightByTrigger?.[safeTrigger] || {
            loading: false,
            requestKey: '',
            log: '',
            logHistory: [],
            data: null,
            error: '',
          }

          if (
            requestKey !== undefined &&
            toNormalizedName(requestKey) &&
            currentInsight.requestKey !== toNormalizedName(requestKey)
          ) {
            return state
          }

          return {
            insightByTrigger: {
              ...state.insightByTrigger,
              [safeTrigger]: {
                ...currentInsight,
                loading: false,
                data,
                error: '',
              },
            },
          }
        }),

      setInsightError: (trigger, errorMessage, requestKey) =>
        set((state) => {
          const safeTrigger = normalizeInsightTrigger(trigger)
          const currentInsight = state.insightByTrigger?.[safeTrigger] || {
            loading: false,
            requestKey: '',
            log: '',
            logHistory: [],
            data: null,
            error: '',
          }

          if (
            requestKey !== undefined &&
            toNormalizedName(requestKey) &&
            currentInsight.requestKey !== toNormalizedName(requestKey)
          ) {
            return state
          }

          return {
            insightByTrigger: {
              ...state.insightByTrigger,
              [safeTrigger]: {
                ...currentInsight,
                loading: false,
                data: null,
                error: toNormalizedName(errorMessage),
              },
            },
          }
        }),

      clearInsight: (trigger) =>
        set((state) => {
          const safeTrigger = normalizeInsightTrigger(trigger)
          return {
            insightByTrigger: {
              ...state.insightByTrigger,
              [safeTrigger]: {
                loading: false,
                requestKey: '',
                log: '',
                logHistory: [],
                data: null,
                error: '',
              },
            },
          }
        }),

      trackRecipeSwiped: (recipeName) =>
        set((state) => ({
          swipedRecipes: addUnique(state.swipedRecipes, recipeName, MAX_HISTORY_SIZE),
        })),

      trackRecipeCooked: (recipeName) =>
        set((state) => ({
          cookedRecipes: addUnique(state.cookedRecipes, recipeName, MAX_HISTORY_SIZE),
        })),

      trackIngredientWasted: (ingredientName) =>
        set((state) => ({
          wastedIngredients: addUnique(state.wastedIngredients, ingredientName, MAX_HISTORY_SIZE),
        })),

      // Builds the user context packet sent to agents
      buildUserContext: () => {
        const { swipedRecipes, cookedRecipes, wastedIngredients } = get()
        return {
          swipedRecipes: swipedRecipes.slice(0, 15),
          cookedRecipes: cookedRecipes.slice(0, 15),
          wastedIngredients: wastedIngredients.slice(0, 15),
        }
      },
    }),
    {
      name: BEHAVIOR_STORAGE_KEY,
      partialize: (state) => ({
        swipedRecipes: state.swipedRecipes,
        cookedRecipes: state.cookedRecipes,
        wastedIngredients: state.wastedIngredients,
      }),
    },
  ),
)
