import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const BEHAVIOR_STORAGE_KEY = 'kapya-behavior-store'
const MAX_HISTORY_SIZE = 50

const toNormalizedName = (value) => String(value ?? '').trim()

const addUnique = (list, item, maxSize) => {
  const name = toNormalizedName(item)
  if (!name) return list
  const filtered = list.filter((existing) => toNormalizedName(existing) !== name)
  return [name, ...filtered].slice(0, maxSize)
}

export const useBehaviorStore = create(
  persist(
    (set, get) => ({
      swipedRecipes: [],
      cookedRecipes: [],
      wastedIngredients: [],

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
