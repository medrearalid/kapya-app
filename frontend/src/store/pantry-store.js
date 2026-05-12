import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const THEME_STORAGE_KEY = 'kapya-theme'
const PROFILE_STORAGE_KEY = 'kapya-budget-profile'
const ONBOARDING_STORAGE_KEY = 'kapya-onboarding-completed'
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

export const productUnitOptions = [
  'adet',
  'gram',
  'kilogram',
  'paket',
  'bag',
  'litre',
  'mililitre',
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

const getSavedBudgetProfile = () => {
  if (globalThis.window === undefined) {
    return budgetProfileOptions[0].id
  }

  const savedProfile = globalThis.window.localStorage.getItem(PROFILE_STORAGE_KEY)
  return budgetProfileOptions.some((profile) => profile.id === savedProfile)
    ? savedProfile
    : budgetProfileOptions[0].id
}

const getSavedOnboardingState = () => {
  if (globalThis.window === undefined) {
    return false
  }

  return globalThis.window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
}

const getInitialTheme = () => getSavedTheme() || getSystemTheme()

const persistTheme = (theme) => {
  if (globalThis.window === undefined) {
    return
  }

  globalThis.window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

const persistBudgetProfile = (profile) => {
  if (globalThis.window === undefined) {
    return
  }

  globalThis.window.localStorage.setItem(PROFILE_STORAGE_KEY, profile)
}

const persistOnboardingState = (value) => {
  if (globalThis.window === undefined) {
    return
  }

  globalThis.window.localStorage.setItem(ONBOARDING_STORAGE_KEY, value ? 'true' : 'false')
}

const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

const normalizeUnit = (value) => {
  const unit = normalize(value)
  if (!unit) {
    return 'adet'
  }

  return unit === 'bağ' ? 'bag' : unit
}

const resolveShelfLifeDate = (firstDate, secondDate) => {
  const first = String(firstDate ?? '').trim()
  const second = String(secondDate ?? '').trim()

  if (!first) {
    return second || daysFromNow(7)
  }

  if (!second) {
    return first
  }

  return first < second ? first : second
}

const getMergeIndex = (products, targetProduct) =>
  products.findIndex(
    (product) =>
      normalize(product?.name) === normalize(targetProduct?.name) &&
      normalizeUnit(product?.unit) === normalizeUnit(targetProduct?.unit),
  )

const mergeIncomingProduct = (products, incomingProduct) => {
  const now = Date.now()
  const existingIndex = getMergeIndex(products, incomingProduct)

  if (existingIndex < 0) {
    return [
      {
        ...incomingProduct,
        id: createProductId(),
        addedAt: now,
        updatedAt: now,
      },
      ...products,
    ]
  }

  const nextProducts = [...products]
  const existingProduct = nextProducts[existingIndex]
  const mergedQuantity = Number(
    (
      toPositiveNumber(existingProduct.quantity, 0) +
      toPositiveNumber(incomingProduct.quantity, 0)
    ).toFixed(2),
  )

  nextProducts[existingIndex] = {
    ...existingProduct,
    quantity: mergedQuantity,
    estimatedShelfLifeEndDate: resolveShelfLifeDate(
      existingProduct.estimatedShelfLifeEndDate,
      incomingProduct.estimatedShelfLifeEndDate,
    ),
    updatedAt: now,
  }

  return nextProducts
}

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

const createDefaultProducts = () => [
  {
    id: createProductId(),
    name: 'Makarna',
    quantity: 2,
    unit: 'paket',
    estimatedShelfLifeEndDate: daysFromNow(180),
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: createProductId(),
    name: 'Yumurta',
    quantity: 10,
    unit: 'adet',
    estimatedShelfLifeEndDate: daysFromNow(9),
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
]

export const budgetProfiles = budgetProfileOptions

export const getBudgetProfileLabelKey = (profileId) =>
  budgetProfileOptions.find((profile) => profile.id === profileId)?.labelKey ||
  'budgetProfiles.student'

export const usePantryStore = create(
  persist(
    (set) => ({
  selectedBudgetProfile: getSavedBudgetProfile(),
  hasCompletedOnboarding: getSavedOnboardingState(),
  currentTheme: getInitialTheme(),
  products: createDefaultProducts(),
  generatedRecipes: [],
  agentInsight: null,
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

    persistBudgetProfile(profile)
    set({ selectedBudgetProfile: profile })
  },

  completeOnboarding: (profile) => {
    if (!budgetProfileOptions.some((option) => option.id === profile)) {
      return
    }

    persistBudgetProfile(profile)
    persistOnboardingState(true)
    set({
      selectedBudgetProfile: profile,
      hasCompletedOnboarding: true,
    })
  },

  resetAllData: () => {
    persistBudgetProfile(budgetProfileOptions[0].id)
    persistOnboardingState(false)

    set((state) => ({
      selectedBudgetProfile: budgetProfileOptions[0].id,
      hasCompletedOnboarding: false,
      products: createDefaultProducts(),
      generatedRecipes: [],
      agentInsight: null,
      toastMessage: {
        id: Date.now(),
        message: 'Veriler temizlendi.',
      },
    }))
  },

  addProduct: (productInput) =>
    set((state) => {
      const name = String(productInput?.name ?? '').trim()
      if (!name) {
        return state
      }

      const parsedQuantity = Number(productInput?.quantity)
      const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1
      const unit = normalizeUnit(productInput?.unit ?? 'adet')
      const estimatedShelfLifeEndDate =
        String(productInput?.estimatedShelfLifeEndDate ?? '').trim() || daysFromNow(7)

      const incomingProduct = {
        name,
        quantity,
        unit,
        estimatedShelfLifeEndDate,
      }

      return {
        products: mergeIncomingProduct(state.products, incomingProduct),
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
          const unit = normalizeUnit(item?.unit ?? 'adet')
          const shelfLifeDays = toPositiveNumber(item?.estimatedShelfLifeDays, 7)

          return {
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

      const mergedProducts = normalizedProducts.reduce(
        (currentProducts, incomingProduct) =>
          mergeIncomingProduct(currentProducts, incomingProduct),
        state.products,
      )

      return {
        products: mergedProducts,
      }
    }),

  setGeneratedRecipes: (recipes) =>
    set({
      generatedRecipes: Array.isArray(recipes) ? recipes : [],
    }),

  setAgentInsight: (insight) =>
    set({
      agentInsight:
        insight && typeof insight === 'object'
          ? {
              tasarrufEdilenTutar: Math.max(0, Math.round(Number(insight?.tasarrufEdilenTutar) || 0)),
              ajanMesaji: String(insight?.ajanMesaji ?? '').trim(),
            }
          : null,
    }),

  clearGeneratedRecipes: () =>
    set({
      generatedRecipes: [],
      agentInsight: null,
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
            updatedAt: Date.now(),
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
}),
    {
      name: 'kapya-pantry-store',
      partialize: (state) => ({
        selectedBudgetProfile: state.selectedBudgetProfile,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        products: state.products,
      }),
    },
  ),
)