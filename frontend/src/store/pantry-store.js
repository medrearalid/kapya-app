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