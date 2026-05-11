import { create } from 'zustand'

const THEME_STORAGE_KEY = 'kapya-theme'
const themeOptions = new Set(['light', 'dark'])

const budgetProfileOptions = [
  {
    id: 'öğrenci',
    labelKey: 'budgetProfiles.student',
  },
  {
    id: 'aile',
    labelKey: 'budgetProfiles.family',
  },
  {
    id: 'lüks',
    labelKey: 'budgetProfiles.luxury',
  },
]

const daysFromNow = (days) => {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)
  return targetDate.toISOString().slice(0, 10)
}

const toPositiveNumber = (value, fallbackValue = 1) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue
}

const getSystemTheme = () => {
  if (
    globalThis.window === undefined ||
    typeof globalThis.window.matchMedia !== 'function'
  ) {
    return 'light'
  }

  return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const getSavedTheme = () => {
  if (globalThis.window === undefined) {
    return null
  }

  const savedTheme = globalThis.window.localStorage.getItem(THEME_STORAGE_KEY)
  return themeOptions.has(savedTheme) ? savedTheme : null
}

const getInitialTheme = () => getSavedTheme() || getSystemTheme()

const persistTheme = (theme) => {
  if (globalThis.window === undefined) {
    return
  }

  globalThis.window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

const normalizeIngredient = (ingredient) => ({
  name: String(ingredient?.name ?? ingredient?.isim ?? '').trim(),
  baseAmount: Number(ingredient?.baseAmount ?? ingredient?.bazMiktar ?? 0),
  unit: String(ingredient?.unit ?? ingredient?.birim ?? '').trim(),
})

const createProductId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const defaultProducts = [
  {
    id: createProductId(),
    name: 'Makarna',
    quantity: 2,
    unit: 'paket',
    estimatedShelfLifeEndDate: daysFromNow(180),
  },
  {
    id: createProductId(),
    name: 'Yumurta',
    quantity: 10,
    unit: 'adet',
    estimatedShelfLifeEndDate: daysFromNow(9),
  },
]

export const budgetProfiles = budgetProfileOptions

export const getBudgetProfileLabelKey = (profileId) =>
  budgetProfileOptions.find((profile) => profile.id === profileId)?.labelKey ||
  'budgetProfiles.student'

export const usePantryStore = create((set) => ({
  selectedBudgetProfile: 'öğrenci',
  currentTheme: getInitialTheme(),
  products: defaultProducts,
  generatedRecipes: [],
  toastMessage: null,

  initializeThemeFromSystem: () => {
    const nextTheme = getSavedTheme() || getSystemTheme()
    set({ currentTheme: nextTheme })
  },

  setTheme: (theme) => {
    if (!themeOptions.has(theme)) {
      return
    }

    persistTheme(theme)
    set({ currentTheme: theme })
  },

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.currentTheme === 'dark' ? 'light' : 'dark'
      persistTheme(nextTheme)

      return {
        currentTheme: nextTheme,
      }
    }),

  updateBudgetProfile: (profile) => {
    if (!budgetProfileOptions.some((option) => option.id === profile)) {
      return
    }

    set({ selectedBudgetProfile: profile })
  },

  addProduct: (productInput) =>
    set((state) => {
      const name = String(productInput?.name ?? '').trim()
      if (!name) {
        return state
      }

      const parsedQuantity = Number(productInput?.quantity)
      const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1
      const unit = String(productInput?.unit ?? 'adet').trim() || 'adet'
      const estimatedShelfLifeEndDate =
        String(productInput?.estimatedShelfLifeEndDate ?? '').trim() || daysFromNow(7)

      const newProduct = {
        id: createProductId(),
        name,
        quantity,
        unit,
        estimatedShelfLifeEndDate,
      }

      return {
        products: [newProduct, ...state.products],
      }
    }),

  addProductsBatch: (productList) =>
    set((state) => {
      const normalizedProducts = (Array.isArray(productList) ? productList : [])
        .map((item) => {
          const name = String(item?.name ?? '').trim()
          if (!name) {
            return null
          }

          const quantity = toPositiveNumber(item?.quantity, 1)
          const unit = String(item?.unit ?? 'adet').trim() || 'adet'
          const shelfLifeDays = toPositiveNumber(item?.estimatedShelfLifeDays, 7)

          return {
            id: createProductId(),
            name,
            quantity,
            unit,
            estimatedShelfLifeEndDate: daysFromNow(Math.round(shelfLifeDays)),
          }
        })
        .filter(Boolean)

      if (normalizedProducts.length === 0) {
        return state
      }

      return {
        products: [...normalizedProducts, ...state.products],
      }
    }),

  setGeneratedRecipes: (recipes) =>
    set({
      generatedRecipes: Array.isArray(recipes) ? recipes : [],
    }),

  clearGeneratedRecipes: () =>
    set({
      generatedRecipes: [],
    }),

  consumeRecipeIngredients: ({ ingredients, portionSize = 1 }) =>
    set((state) => {
      const multiplier = Math.max(1, Number(portionSize) || 1)
      const usageByName = new Map()

      ;(Array.isArray(ingredients) ? ingredients : [])
        .map(normalizeIngredient)
        .filter((ingredient) => ingredient.name && ingredient.baseAmount > 0)
        .forEach((ingredient) => {
          const key = normalize(ingredient.name)
          const currentAmount = usageByName.get(key) || 0
          usageByName.set(key, currentAmount + ingredient.baseAmount * multiplier)
        })

      const updatedProducts = state.products.flatMap((product) => {
        const neededAmount = usageByName.get(normalize(product.name)) || 0
        if (neededAmount <= 0) {
          return [product]
        }

        const currentQuantity = Number(product.quantity)
        const remainingQuantity =
          Number.isFinite(currentQuantity) && currentQuantity > 0
            ? Number((currentQuantity - neededAmount).toFixed(2))
            : 0

        if (remainingQuantity <= 0) {
          return []
        }

        return [
          {
            ...product,
            quantity: remainingQuantity,
          },
        ]
      })

      return {
        products: updatedProducts,
      }
    }),

  showToast: (message) =>
    set({
      toastMessage: {
        id: Date.now(),
        message,
      },
    }),

  clearToast: () =>
    set({
      toastMessage: null,
    }),

  removeProduct: (idOrName) =>
    set((state) => {
      const target = normalize(idOrName)
      if (!target) {
        return state
      }

      return {
        products: state.products.filter(
          (product) => product.id !== idOrName && normalize(product.name) !== target,
        ),
      }
    }),
}))