import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const RECIPE_STORAGE_KEY = 'kapya-recipe-store'

const createRecipeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const normalizeText = (value) => String(value ?? '').trim()
const normalizeCurrency = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Number(parsed.toFixed(2))
}

const normalizeRecipeNameKey = (value) =>
  normalizeText(value)
    .toLocaleLowerCase('tr-TR')
    .replaceAll(/\s+/g, ' ')

const normalizeImageCacheMap = (cacheInput) => {
  const cache = cacheInput && typeof cacheInput === 'object' ? cacheInput : {}
  const normalizedCache = {}

  for (const [recipeName, imageUrl] of Object.entries(cache)) {
    const key = normalizeRecipeNameKey(recipeName)
    const value = normalizeText(imageUrl)

    if (!key || !value) {
      continue
    }

    normalizedCache[key] = value
  }

  return normalizedCache
}

const normalizeIngredient = (ingredient) => {
  const isim = normalizeText(ingredient?.isim ?? ingredient?.name)
  if (!isim) {
    return null
  }

  return {
    isim,
    miktar: normalizeText(ingredient?.miktar ?? ingredient?.baseAmount ?? '1') || '1',
    birim: normalizeText(ingredient?.birim ?? ingredient?.unit ?? 'adet') || 'adet',
  }
}

const normalizeIngredientList = (ingredients) =>
  (Array.isArray(ingredients) ? ingredients : []).map(normalizeIngredient).filter(Boolean)

const normalizeStringList = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => normalizeText(item))
    .filter(Boolean)

const normalizeChefTips = (tips) => {
  if (Array.isArray(tips)) {
    return normalizeStringList(tips)
  }

  const text = normalizeText(tips)
  if (!text) {
    return []
  }

  return text
    .split(/[\n\u2022*]/g)
    .map((item) => item.replace(/^[-\d.)\s]+/g, '').trim())
    .filter(Boolean)
}

const normalizeIncomingRecipe = (recipeInput) => {
  const recipe = recipeInput && typeof recipeInput === 'object' ? recipeInput : null
  if (!recipe) {
    return null
  }

  const isim = normalizeText(recipe?.isim ?? recipe?.tarifAdi ?? recipe?.name)
  if (!isim) {
    return null
  }

  const matchedIngredients = normalizeIngredientList(
    recipe?.malzemeler?.matched ?? recipe?.matchedIngredients,
  )
  const missingIngredients = normalizeIngredientList(
    recipe?.malzemeler?.missing ?? recipe?.missingIngredients,
  )

  return {
    id: normalizeText(recipe?.id),
    isim,
    aciklama: normalizeText(recipe?.aciklama ?? recipe?.kisaAciklama),
    kalori:
      normalizeText(recipe?.kalori ?? recipe?.ortalamaKalori ?? recipe?.calories) ||
      'Belirtilmedi',
    porsiyon: normalizeText(recipe?.porsiyon ?? recipe?.portion) || '2 kisilik',
    sure: normalizeText(recipe?.sure ?? recipe?.tahminiSure ?? recipe?.tahminiSuresi) || '30 dakika',
    zorluk: normalizeText(recipe?.zorluk) || 'Orta',
    pufNoktalari: normalizeChefTips(recipe?.pufNoktalari ?? recipe?.pufNoktasi),
    malzemeler: {
      matched: matchedIngredients,
      missing: missingIngredients,
    },
    adimlar: normalizeStringList(recipe?.adimlar ?? recipe?.pisirmeAdimlari),
    porsiyonMaliyetiTl: normalizeCurrency(
      recipe?.porsiyonMaliyetiTl ?? recipe?.porsiyonMaliyeti ?? recipe?.costPerPlateTl,
    ),
    nanoBananaGorseli:
      normalizeText(recipe?.nanoBananaGorseli ?? recipe?.goruntuUrl ?? recipe?.imageUrl) || '',
  }
}

const mergeRecipes = ({ currentRecipes, incomingRecipe, source }) => {
  const nextRecipe = normalizeIncomingRecipe(incomingRecipe)
  if (!nextRecipe) {
    return currentRecipes
  }

  const existingIndex = currentRecipes.findIndex(
    (recipe) =>
      (nextRecipe.id && recipe.id === nextRecipe.id) ||
      normalizeRecipeNameKey(recipe.isim) === normalizeRecipeNameKey(nextRecipe.isim),
  )

  const now = Date.now()

  if (existingIndex < 0) {
    return [
      {
        ...nextRecipe,
        id: nextRecipe.id || createRecipeId(),
        isFavorite: Boolean(nextRecipe?.isFavorite),
        source: normalizeText(source) || 'library',
        createdAt: now,
        updatedAt: now,
      },
      ...currentRecipes,
    ]
  }

  const existingRecipe = currentRecipes[existingIndex]
  const mergedRecipe = {
    ...existingRecipe,
    ...nextRecipe,
    id: existingRecipe.id,
    isFavorite: Boolean(existingRecipe.isFavorite || nextRecipe?.isFavorite),
    source: normalizeText(source) || existingRecipe.source || 'library',
    createdAt: Number(existingRecipe.createdAt) || now,
    updatedAt: now,
  }

  const nextRecipes = [...currentRecipes]
  nextRecipes[existingIndex] = mergedRecipe
  return nextRecipes
}

const buildImageCacheFromRecipes = (recipes) => {
  const imageCache = {}

  for (const recipe of Array.isArray(recipes) ? recipes : []) {
    const recipeNameKey = normalizeRecipeNameKey(recipe?.isim)
    const imageUrl = normalizeText(recipe?.nanoBananaGorseli)

    if (!recipeNameKey || !imageUrl) {
      continue
    }

    imageCache[recipeNameKey] = imageUrl
  }

  return imageCache
}

export const toPlannerRecipe = (recipeInput) => {
  const recipe = normalizeIncomingRecipe(recipeInput)
  if (!recipe) {
    return null
  }

  return {
    id: recipe.id || createRecipeId(),
    tarifAdi: recipe.isim,
    kisaAciklama: recipe.aciklama,
    tahminiSure: recipe.sure,
    goruntuUrl: recipe.nanoBananaGorseli,
    ortalamaKalori: recipe.kalori,
    porsiyon: recipe.porsiyon,
    zorluk: recipe.zorluk,
    porsiyonMaliyetiTl: recipe.porsiyonMaliyetiTl,
    pufNoktasi: recipe.pufNoktalari,
    matchedIngredients: recipe.malzemeler.matched,
    missingIngredients: recipe.malzemeler.missing,
    pisirmeAdimlari: recipe.adimlar,
  }
}

export const useRecipeStore = create(
  persist(
    (set, get) => ({
      savedRecipes: [],
      imageCacheByRecipeName: {},

      saveRecipe: (recipeInput, options = {}) => {
        let savedRecipe = null

        set((state) => {
          const updatedRecipes = mergeRecipes({
            currentRecipes: state.savedRecipes,
            incomingRecipe: recipeInput,
            source: options?.source,
          })

          if (updatedRecipes.length > 0) {
            const targetId = normalizeText(recipeInput?.id)
            const targetName = normalizeRecipeNameKey(
              recipeInput?.isim ?? recipeInput?.tarifAdi ?? recipeInput?.name,
            )

            savedRecipe =
              updatedRecipes.find((recipe) => recipe.id === targetId) ||
              updatedRecipes.find((recipe) => normalizeRecipeNameKey(recipe.isim) === targetName) ||
              null
          }

          return {
            savedRecipes: updatedRecipes,
            imageCacheByRecipeName: {
              ...state.imageCacheByRecipeName,
              ...buildImageCacheFromRecipes(updatedRecipes),
            },
          }
        })

        return savedRecipe
      },

      saveRecipes: (recipes, options = {}) =>
        set((state) => {
          const nextRecipes = (Array.isArray(recipes) ? recipes : []).reduce(
            (currentRecipes, recipe) =>
              mergeRecipes({
                currentRecipes,
                incomingRecipe: recipe,
                source: options?.source,
              }),
            state.savedRecipes,
          )

          return {
            savedRecipes: nextRecipes,
            imageCacheByRecipeName: {
              ...state.imageCacheByRecipeName,
              ...buildImageCacheFromRecipes(nextRecipes),
            },
          }
        }),

      cacheRecipeImage: (recipeName, imageUrl) =>
        set((state) => {
          const recipeNameKey = normalizeRecipeNameKey(recipeName)
          const normalizedImageUrl = normalizeText(imageUrl)

          if (!recipeNameKey || !normalizedImageUrl) {
            return state
          }

          return {
            imageCacheByRecipeName: {
              ...state.imageCacheByRecipeName,
              [recipeNameKey]: normalizedImageUrl,
            },
          }
        }),

      getCachedRecipeImage: (recipeName) => {
        const recipeNameKey = normalizeRecipeNameKey(recipeName)
        if (!recipeNameKey) {
          return ''
        }

        return String(get().imageCacheByRecipeName?.[recipeNameKey] ?? '').trim()
      },

      toggleFavorite: (recipeRef) =>
        set((state) => {
          const targetId = normalizeText(recipeRef?.id ?? recipeRef)
          const targetName = normalizeRecipeNameKey(recipeRef?.isim ?? recipeRef?.name)
          const hasIdMatch =
            Boolean(targetId) &&
            state.savedRecipes.some((recipe) => normalizeText(recipe?.id) === targetId)

          return {
            savedRecipes: state.savedRecipes.map((recipe) => {
              const isMatch = hasIdMatch
                ? normalizeText(recipe?.id) === targetId
                : Boolean(targetName) && normalizeRecipeNameKey(recipe?.isim) === targetName

              if (!isMatch) {
                return recipe
              }

              return {
                ...recipe,
                isFavorite: !recipe.isFavorite,
                updatedAt: Date.now(),
              }
            }),
          }
        }),

      deleteRecipe: (recipeId) =>
        set((state) => {
          const targetId = normalizeText(recipeId)
          if (!targetId) {
            return state
          }

          const nextRecipes = state.savedRecipes.filter(
            (recipe) => normalizeText(recipe?.id) !== targetId,
          )

          return {
            savedRecipes: nextRecipes,
            imageCacheByRecipeName: buildImageCacheFromRecipes(nextRecipes),
          }
        }),

      clearRecipeMemory: () =>
        set({
          savedRecipes: [],
          imageCacheByRecipeName: {},
        }),

      getRecipeById: (recipeId) => {
        const targetId = normalizeText(recipeId)
        if (!targetId) {
          return null
        }

        return get().savedRecipes.find((recipe) => recipe.id === targetId) || null
      },
    }),
    {
      name: RECIPE_STORAGE_KEY,
      merge: (persistedState, currentState) => {
        const persisted = persistedState && typeof persistedState === 'object' ? persistedState : {}
        const persistedRecipes = Array.isArray(persisted.savedRecipes) ? persisted.savedRecipes : []
        const persistedCache = normalizeImageCacheMap(persisted.imageCacheByRecipeName)
        const recipesCache = buildImageCacheFromRecipes(persistedRecipes)

        return {
          ...currentState,
          ...persisted,
          savedRecipes: persistedRecipes,
          imageCacheByRecipeName: {
            ...persistedCache,
            ...recipesCache,
          },
        }
      },
      partialize: (state) => ({
        savedRecipes: state.savedRecipes,
        imageCacheByRecipeName: state.imageCacheByRecipeName,
      }),
    },
  ),
)
