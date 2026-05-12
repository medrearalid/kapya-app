import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const THEME_STORAGE_KEY = 'kapya-theme'
const PROFILE_STORAGE_KEY = 'kapya-budget-profile'
const ONBOARDING_STORAGE_KEY = 'kapya-onboarding-completed'
const themeOptions = new Set(['light', 'dark'])
const MAX_RECENT_RECIPE_NAMES = 15

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

export const KATEGORI_OPTIONS = [
  'Sebzeler',
  'Meyveler',
  'Et ve Tavuk',
  'Süt Ürünleri',
  'Baharatlar',
  'Atıştırmalıklar',
  'Temel Gıda',
  'Diğer',
]

const DEFAULT_SHELF_LIFE_DAYS = 7
const PRODUCT_STATUS_ACTIVE = 'active'
const PRODUCT_STATUS_DEPLETED = 'tukendi'
const FINANCE_DEFAULT_STATE = Object.freeze({
  monthlyKitchenSpend: {},
  monthlyPreventedWaste: {},
})

const CATEGORY_SHELF_LIFE_DAYS = Object.freeze({
  Sebzeler: 5,
  Meyveler: 6,
  'Et ve Tavuk': 3,
  'Süt Ürünleri': 7,
  Baharatlar: 365,
  Atıştırmalıklar: 120,
  'Temel Gıda': 180,
  'Diğer': 14,
})

export const productUnitOptions = [
  'adet',
  'gram',
  'paket',
  'litre',
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

const toCurrencyNumber = (value, fallbackValue = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallbackValue
  }

  return Number(parsed.toFixed(2))
}

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7)

const increaseMonthlyAmount = (monthMap, monthKey, amount) => ({
  ...(monthMap && typeof monthMap === 'object' ? monthMap : {}),
  [monthKey]: toCurrencyNumber(
    Number(monthMap?.[monthKey] || 0) + Math.max(0, Number(amount) || 0),
    0,
  ),
})

const normalizeFinancialMap = (value) => {
  const entries = Object.entries(value && typeof value === 'object' ? value : {})
  return entries.reduce((accumulator, [key, amount]) => {
    accumulator[String(key)] = toCurrencyNumber(amount, 0)
    return accumulator
  }, {})
}

const getShelfLifeDaysByCategory = (kategori) =>
  CATEGORY_SHELF_LIFE_DAYS[kategori] ?? DEFAULT_SHELF_LIFE_DAYS

const resolveShelfLifeDays = (value, kategori) => {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed)
  }

  return getShelfLifeDaysByCategory(kategori)
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

const normalizeRecipeNameKey = (value) => normalize(value).replace(/\s+/g, ' ')

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

  return [first, second].sort((left, right) => left.localeCompare(right, 'tr'))[0]
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
        status: PRODUCT_STATUS_ACTIVE,
        addedAt: now,
        updatedAt: now,
      },
      ...products,
    ]
  }

  const nextProducts = [...products]
  const existingProduct = nextProducts[existingIndex]
  const existingQuantity = toPositiveNumber(existingProduct.quantity, 0)
  const incomingQuantity = toPositiveNumber(incomingProduct.quantity, 0)
  const existingUnitCost = toCurrencyNumber(existingProduct?.birimMaliyet, 0)
  const incomingUnitCost = toCurrencyNumber(incomingProduct?.birimMaliyet, 0)

  let resolvedIncomingUnitCost = Math.max(0, incomingUnitCost)
  if (resolvedIncomingUnitCost <= 0 && existingUnitCost > 0) {
    resolvedIncomingUnitCost = existingUnitCost
  }
  const existingStockValue = toCurrencyNumber(
    existingProduct?.fiyat,
    existingUnitCost > 0 ? existingUnitCost * existingQuantity : 0,
  )
  const incomingStockValue = toCurrencyNumber(
    incomingProduct?.fiyat,
    resolvedIncomingUnitCost > 0 ? resolvedIncomingUnitCost * incomingQuantity : 0,
  )

  const mergedQuantity = Number(
    (
      toPositiveNumber(existingProduct.quantity, 0) +
      toPositiveNumber(incomingProduct.quantity, 0)
    ).toFixed(2),
  )
  const mergedStockValue = toCurrencyNumber(existingStockValue + incomingStockValue, 0)
  const mergedUnitCost = mergedQuantity > 0 ? toCurrencyNumber(mergedStockValue / mergedQuantity, 0) : 0

  nextProducts[existingIndex] = {
    ...existingProduct,
    quantity: mergedQuantity,
    status: PRODUCT_STATUS_ACTIVE,
    fiyat: mergedStockValue,
    birimMaliyet: mergedUnitCost,
    estimatedShelfLifeEndDate: resolveShelfLifeDate(
      existingProduct.estimatedShelfLifeEndDate,
      incomingProduct.estimatedShelfLifeEndDate,
    ),
    rafOmruGun: Math.min(
      toPositiveNumber(
        existingProduct.rafOmruGun,
        getShelfLifeDaysByCategory(existingProduct.kategori),
      ),
      toPositiveNumber(
        incomingProduct.rafOmruGun,
        getShelfLifeDaysByCategory(incomingProduct.kategori),
      ),
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

const normalizeProductStatus = (status, quantity) => {
  if (Number(quantity) <= 0) {
    return PRODUCT_STATUS_DEPLETED
  }

  return String(status ?? '').trim() === PRODUCT_STATUS_DEPLETED
    ? PRODUCT_STATUS_DEPLETED
    : PRODUCT_STATUS_ACTIVE
}

const normalizeStoredProduct = (product) => {
  const quantity = Number(product?.quantity)
  const normalizedQuantity = Number.isFinite(quantity) ? Number(quantity.toFixed(2)) : 0
  const birimMaliyet = toCurrencyNumber(product?.birimMaliyet, 0)
  const fiyat = toCurrencyNumber(
    product?.fiyat,
    birimMaliyet > 0 ? birimMaliyet * Math.max(0, normalizedQuantity) : 0,
  )

  return {
    ...product,
    quantity: Math.max(0, normalizedQuantity),
    status: normalizeProductStatus(product?.status, normalizedQuantity),
    birimMaliyet,
    fiyat,
  }
}

const createDefaultProducts = () => [
  {
    id: createProductId(),
    name: 'Makarna',
    quantity: 2,
    status: PRODUCT_STATUS_ACTIVE,
    fiyat: 70,
    birimMaliyet: 35,
    unit: 'paket',
    kategori: 'Temel Gıda',
    rafOmruGun: getShelfLifeDaysByCategory('Temel Gıda'),
    estimatedShelfLifeEndDate: daysFromNow(180),
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: createProductId(),
    name: 'Yumurta',
    quantity: 10,
    status: PRODUCT_STATUS_ACTIVE,
    fiyat: 45,
    birimMaliyet: 4.5,
    unit: 'adet',
    kategori: 'Temel Gıda',
    rafOmruGun: getShelfLifeDaysByCategory('Temel Gıda'),
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
  finance: {
    ...FINANCE_DEFAULT_STATE,
  },
  generatedRecipes: [],
  recentRecipeNames: [],
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

    set(() => ({
      selectedBudgetProfile: budgetProfileOptions[0].id,
      hasCompletedOnboarding: false,
      products: createDefaultProducts(),
      finance: {
        ...FINANCE_DEFAULT_STATE,
      },
      generatedRecipes: [],
      recentRecipeNames: [],
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
      const kategori = KATEGORI_OPTIONS.includes(productInput?.kategori)
        ? productInput.kategori
        : 'Diğer'
      const rafOmruGun = resolveShelfLifeDays(
        productInput?.rafOmruGun ?? productInput?.estimatedShelfLifeDays,
        kategori,
      )
      const estimatedShelfLifeEndDate =
        String(productInput?.estimatedShelfLifeEndDate ?? '').trim() || daysFromNow(rafOmruGun)

      const incomingProduct = {
        name,
        quantity,
        unit,
        fiyat: toCurrencyNumber(productInput?.fiyat ?? productInput?.price, 0),
        birimMaliyet: toCurrencyNumber(productInput?.birimMaliyet ?? productInput?.unitCost, 0),
        estimatedShelfLifeEndDate,
        kategori,
        rafOmruGun,
      }

      return {
        products: mergeIncomingProduct(state.products, incomingProduct),
      }
    }),

  addProductsBatch: (productList, options = {}) =>
    set((state) => {
      const normalizedProducts = (Array.isArray(productList) ? productList : [])
        .map((item) => {
          const name = String(item?.name ?? '').trim()
          if (!name) {
            return null
          }

          const quantity = toPositiveNumber(item?.quantity, 1)
          const unit = normalizeUnit(item?.unit ?? 'adet')
          const kategori = KATEGORI_OPTIONS.includes(item?.kategori) ? item.kategori : 'Diğer'
          const rafOmruGun = resolveShelfLifeDays(
            item?.estimatedShelfLifeDays ?? item?.rafOmruGun,
            kategori,
          )
          const estimatedShelfLifeEndDate =
            String(item?.estimatedShelfLifeEndDate ?? '').trim() || daysFromNow(rafOmruGun)
          const fiyat = toCurrencyNumber(item?.fiyat ?? item?.price, 0)
          const birimMaliyet =
            toCurrencyNumber(item?.birimMaliyet ?? item?.unitCost, 0) ||
            (quantity > 0 && fiyat > 0 ? toCurrencyNumber(fiyat / quantity, 0) : 0)

          return {
            name,
            quantity,
            unit,
            fiyat,
            birimMaliyet,
            estimatedShelfLifeEndDate,
            kategori,
            rafOmruGun,
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

      const monthKey = getCurrentMonthKey()
      const isReceiptSource = String(options?.source ?? '').trim() === 'receipt'
      const receiptSpend = isReceiptSource
        ? normalizedProducts.reduce((sum, item) => sum + toCurrencyNumber(item?.fiyat, 0), 0)
        : 0

      return {
        products: mergedProducts,
        finance: {
          ...state.finance,
          monthlyKitchenSpend:
            receiptSpend > 0
              ? increaseMonthlyAmount(state.finance?.monthlyKitchenSpend, monthKey, receiptSpend)
              : state.finance?.monthlyKitchenSpend || {},
        },
      }
    }),

  setGeneratedRecipes: (recipes) =>
    set({
      generatedRecipes: Array.isArray(recipes) ? recipes : [],
    }),

  addRecentRecipeNames: (recipeNames) =>
    set((state) => {
      const incomingNames = (Array.isArray(recipeNames) ? recipeNames : [])
        .map((name) => String(name ?? '').trim())
        .filter(Boolean)

      if (incomingNames.length === 0) {
        return state
      }

      const mergedNames = [...state.recentRecipeNames]
      const seen = new Set(mergedNames.map((name) => normalizeRecipeNameKey(name)))

      incomingNames.forEach((name) => {
        const key = normalizeRecipeNameKey(name)
        if (!key || seen.has(key)) {
          return
        }

        mergedNames.push(name)
        seen.add(key)
      })

      return {
        recentRecipeNames: mergedNames.slice(-MAX_RECENT_RECIPE_NAMES),
      }
    }),

  clearRecentRecipes: () =>
    set({
      recentRecipeNames: [],
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
      let preventedWasteAmount = 0

      ;(Array.isArray(ingredients) ? ingredients : [])
        .map(normalizeIngredient)
        .filter((ingredient) => ingredient.name && ingredient.baseAmount > 0)
        .forEach((ingredient) => {
          const key = normalize(ingredient.name)
          const currentAmount = usageByName.get(key) || 0
          usageByName.set(key, currentAmount + ingredient.baseAmount * multiplier)
        })

      const updatedProducts = state.products.map((product) => {
        const neededAmount = usageByName.get(normalize(product.name)) || 0
        if (neededAmount <= 0) {
          return product
        }

        const currentQuantity = Number(product.quantity)
        const unitCost =
          toCurrencyNumber(product?.birimMaliyet, 0) ||
          (currentQuantity > 0 ? toCurrencyNumber(Number(product?.fiyat || 0) / currentQuantity, 0) : 0)
        const consumedQuantity = Math.min(
          Math.max(0, Number.isFinite(currentQuantity) ? currentQuantity : 0),
          Math.max(0, neededAmount),
        )

        preventedWasteAmount += consumedQuantity * unitCost

        const remainingQuantity =
          Number.isFinite(currentQuantity) && currentQuantity > 0
            ? Number((currentQuantity - neededAmount).toFixed(2))
            : 0

        const safeRemainingQuantity = Math.max(0, remainingQuantity)
        const remainingStockValue = toCurrencyNumber(safeRemainingQuantity * unitCost, 0)

        return {
          ...product,
          quantity: safeRemainingQuantity,
          fiyat: remainingStockValue,
          birimMaliyet: unitCost,
          status: remainingQuantity > 0 ? PRODUCT_STATUS_ACTIVE : PRODUCT_STATUS_DEPLETED,
          updatedAt: Date.now(),
        }
      })

      const monthKey = getCurrentMonthKey()

      return {
        products: updatedProducts,
        finance: {
          ...state.finance,
          monthlyPreventedWaste: increaseMonthlyAmount(
            state.finance?.monthlyPreventedWaste,
            monthKey,
            preventedWasteAmount,
          ),
        },
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

  updateProductQuantity: ({ id, quantity }) =>
    set((state) => {
      const parsedQuantity = Number(quantity)
      if (!id || !Number.isFinite(parsedQuantity)) {
        return state
      }

      const safeQuantity = parsedQuantity > 0 ? Number(parsedQuantity.toFixed(2)) : 0

      return {
        products: state.products.map((product) =>
          product.id === id
            ? {
                ...product,
                quantity: safeQuantity,
                fiyat: toCurrencyNumber(safeQuantity * toCurrencyNumber(product?.birimMaliyet, 0), 0),
                status: safeQuantity > 0 ? PRODUCT_STATUS_ACTIVE : PRODUCT_STATUS_DEPLETED,
                updatedAt: Date.now(),
              }
            : product,
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
        recentRecipeNames: state.recentRecipeNames,
        finance: state.finance,
      }),
      merge: (persistedState, currentState) => {
        const mergedState = {
          ...currentState,
          ...persistedState,
        }

        return {
          ...mergedState,
          products: (Array.isArray(mergedState?.products) ? mergedState.products : [])
            .map(normalizeStoredProduct)
            .sort((left, right) => {
              const leftDepleted = left.status === PRODUCT_STATUS_DEPLETED
              const rightDepleted = right.status === PRODUCT_STATUS_DEPLETED
              if (leftDepleted !== rightDepleted) {
                return leftDepleted ? 1 : -1
              }

              return String(left.name ?? '').localeCompare(String(right.name ?? ''), 'tr')
            }),
          finance: {
            monthlyKitchenSpend: normalizeFinancialMap(mergedState?.finance?.monthlyKitchenSpend),
            monthlyPreventedWaste: normalizeFinancialMap(mergedState?.finance?.monthlyPreventedWaste),
          },
        }
      },
    },
  ),
)