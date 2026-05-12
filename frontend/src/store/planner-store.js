import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const PLANNER_STORAGE_KEY = 'kapya-planner-store'

const mealTypeOptions = new Set(['ogle', 'aksam'])

const createMealId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const getTodayDateKey = () => new Date().toISOString().slice(0, 10)

const normalizeDateKey = (value) => {
  const text = String(value ?? '').trim()
  if (!text) {
    return getTodayDateKey()
  }

  const parsedDate = new Date(text)
  if (Number.isNaN(parsedDate.getTime())) {
    return getTodayDateKey()
  }

  return parsedDate.toISOString().slice(0, 10)
}

const normalizeMealType = (value) => {
  const normalized = String(value ?? '').trim().toLocaleLowerCase('tr-TR')
  return mealTypeOptions.has(normalized) ? normalized : 'ogle'
}

const normalizePortionSize = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 2
  }

  return Math.min(12, Math.max(1, Math.round(parsed)))
}

const normalizeIngredient = (ingredient) => ({
  isim: String(ingredient?.isim ?? ingredient?.name ?? '').trim(),
  miktar: String(ingredient?.miktar ?? ingredient?.baseAmount ?? '1').trim() || '1',
  birim: String(ingredient?.birim ?? ingredient?.unit ?? 'adet').trim() || 'adet',
})

const normalizeRecipe = (recipe) => ({
  tarifAdi: String(recipe?.tarifAdi ?? '').trim(),
  kisaAciklama: String(recipe?.kisaAciklama ?? '').trim(),
  tahminiSuresi: String(recipe?.tahminiSuresi ?? '').trim(),
  goruntuUrl: String(recipe?.goruntuUrl ?? '').trim(),
  matchedIngredients: (Array.isArray(recipe?.matchedIngredients) ? recipe.matchedIngredients : [])
    .map(normalizeIngredient)
    .filter((ingredient) => ingredient.isim),
  missingIngredients: (Array.isArray(recipe?.missingIngredients) ? recipe.missingIngredients : [])
    .map(normalizeIngredient)
    .filter((ingredient) => ingredient.isim),
  pisirmeAdimlari: (Array.isArray(recipe?.pisirmeAdimlari) ? recipe.pisirmeAdimlari : [])
    .map((step) => String(step ?? '').trim())
    .filter(Boolean),
})

const normalizePlannedMeal = (plannedMeal) => {
  const recipe = normalizeRecipe(plannedMeal?.recipe)
  if (!recipe.tarifAdi) {
    return null
  }

  return {
    id: String(plannedMeal?.id ?? '').trim() || createMealId(),
    date: normalizeDateKey(plannedMeal?.date),
    mealType: normalizeMealType(plannedMeal?.mealType),
    portionSize: normalizePortionSize(plannedMeal?.portionSize),
    recipe,
    completed: Boolean(plannedMeal?.completed),
    createdAt: Number(plannedMeal?.createdAt) || Date.now(),
    completedAt: plannedMeal?.completedAt ? Number(plannedMeal.completedAt) : null,
  }
}

export const usePlannerStore = create(
  persist(
    (set) => ({
      plannedMeals: [],

      addPlannedMeal: ({ date, mealType, portionSize, recipe }) =>
        set((state) => {
          const normalizedMeal = normalizePlannedMeal({
            id: createMealId(),
            date,
            mealType,
            portionSize,
            recipe,
            completed: false,
            createdAt: Date.now(),
            completedAt: null,
          })

          if (!normalizedMeal) {
            return state
          }

          return {
            plannedMeals: [normalizedMeal, ...state.plannedMeals],
          }
        }),

      removePlannedMeal: (mealId) =>
        set((state) => ({
          plannedMeals: state.plannedMeals.filter((meal) => meal.id !== mealId),
        })),

      togglePlannedMealCompleted: (mealId) =>
        set((state) => ({
          plannedMeals: state.plannedMeals.map((meal) => {
            if (meal.id !== mealId) {
              return meal
            }

            const nextCompleted = !meal.completed
            return {
              ...meal,
              completed: nextCompleted,
              completedAt: nextCompleted ? Date.now() : null,
            }
          }),
        })),

      markPlannedMealCompleted: (mealId) =>
        set((state) => ({
          plannedMeals: state.plannedMeals.map((meal) =>
            meal.id === mealId
              ? {
                  ...meal,
                  completed: true,
                  completedAt: Date.now(),
                }
              : meal,
          ),
        })),
    }),
    {
      name: PLANNER_STORAGE_KEY,
      partialize: (state) => ({
        plannedMeals: state.plannedMeals,
      }),
      merge: (persistedState, currentState) => {
        const mergedState = {
          ...currentState,
          ...persistedState,
        }

        return {
          ...mergedState,
          plannedMeals: (Array.isArray(mergedState?.plannedMeals) ? mergedState.plannedMeals : [])
            .map(normalizePlannedMeal)
            .filter(Boolean),
        }
      },
    },
  ),
)
