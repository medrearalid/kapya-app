import { create } from 'zustand'
import { usePantryStore } from './pantry-store'
import { usePlannerStore } from './planner-store'

const DEFAULT_WASTE_PREVENTION_MULTIPLIER = 1.5

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7)

const toSanitizedNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN
  }

  const raw = String(value ?? '').trim()
  if (!raw) {
    return Number.NaN
  }

  const normalized = raw
    .replaceAll(/\s+/g, '')
    .replaceAll(',', '.')
    .replaceAll(/[^\d.-]/g, '')

  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return Number.NaN
  }

  const parsed = Number(normalized)
  if (Number.isFinite(parsed)) {
    return parsed
  }

  const fallbackParsed = Number.parseFloat(normalized)
  return Number.isFinite(fallbackParsed) ? fallbackParsed : Number.NaN
}

const toCurrencyNumber = (value) => {
  const parsed = toSanitizedNumber(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Number(parsed.toFixed(2))
}

const toPositiveNumber = (value, fallbackValue = 0) => {
  const parsed = toSanitizedNumber(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue
}

const getProductUnitCost = (product) => {
  const explicitUnitCost = toCurrencyNumber(product?.birimMaliyet)
  if (explicitUnitCost > 0) {
    return explicitUnitCost
  }

  const quantity = toPositiveNumber(product?.quantity)
  if (quantity <= 0) {
    return 0
  }

  return toCurrencyNumber(toCurrencyNumber(product?.fiyat) / quantity)
}

const getProductStockCost = (product) => {
  const quantity = toPositiveNumber(product?.quantity)
  if (quantity <= 0) {
    return 0
  }

  return toCurrencyNumber(getProductUnitCost(product) * quantity)
}

const calculateTotalInventoryCost = (products) =>
  toCurrencyNumber(
    (Array.isArray(products) ? products : []).reduce(
      (total, product) => total + getProductStockCost(product),
      0,
    ),
  )

const getCompletedMealCost = (meal) => {
  if (meal?.completed !== true) {
    return 0
  }

  const costPerPlate = toCurrencyNumber(meal?.recipe?.porsiyonMaliyetiTl)
  if (costPerPlate <= 0) {
    return 0
  }

  const plateCount = toPositiveNumber(meal?.portionSize, 1)
  return toCurrencyNumber(costPerPlate * plateCount)
}

const calculateTotalConsumedCost = (plannedMeals) =>
  toCurrencyNumber(
    (Array.isArray(plannedMeals) ? plannedMeals : []).reduce(
      (total, meal) => total + getCompletedMealCost(meal),
      0,
    ),
  )

const calculatePreventedWasteValue = (totalConsumedCost, multiplier) => {
  const safeMultiplier = toPositiveNumber(multiplier, DEFAULT_WASTE_PREVENTION_MULTIPLIER)
  return toCurrencyNumber(toCurrencyNumber(totalConsumedCost) * safeMultiplier)
}

const getMonthlyAmount = (monthMap, monthKey) =>
  toCurrencyNumber(
    monthMap && typeof monthMap === 'object' ? monthMap[monthKey] : 0,
  )

const buildFinanceSnapshot = (multiplier) => {
  const pantryState = usePantryStore.getState()
  const plannerState = usePlannerStore.getState()

  const totalInventoryCost = calculateTotalInventoryCost(pantryState?.products)
  const totalConsumedCost = calculateTotalConsumedCost(plannerState?.plannedMeals)
  const preventedWasteValue = calculatePreventedWasteValue(totalConsumedCost, multiplier)
  const monthKey = getCurrentMonthKey()

  return {
    totalInventoryCost,
    totalConsumedCost,
    preventedWasteValue,
    currentMonthSpend: getMonthlyAmount(pantryState?.finance?.monthlyKitchenSpend, monthKey),
    currentMonthPreventedWaste: getMonthlyAmount(
      pantryState?.finance?.monthlyPreventedWaste,
      monthKey,
    ),
  }
}

export const useFinanceStore = create((set, get) => ({
  wastePreventionMultiplier: DEFAULT_WASTE_PREVENTION_MULTIPLIER,
  totalInventoryCost: 0,
  totalConsumedCost: 0,
  preventedWasteValue: 0,
  currentMonthSpend: 0,
  currentMonthPreventedWaste: 0,

  setWastePreventionMultiplier: (value) => {
    const nextMultiplier = toPositiveNumber(value, DEFAULT_WASTE_PREVENTION_MULTIPLIER)
    set({
      wastePreventionMultiplier: nextMultiplier,
      ...buildFinanceSnapshot(nextMultiplier),
    })
  },

  refreshMetrics: () => {
    const activeMultiplier = get().wastePreventionMultiplier
    set(buildFinanceSnapshot(activeMultiplier))
  },

  getDashboardMetrics: () => {
    const state = get()
    return {
      totalInventoryCost: state.totalInventoryCost,
      totalConsumedCost: state.totalConsumedCost,
      preventedWasteValue: state.preventedWasteValue,
      currentMonthSpend: state.currentMonthSpend,
      currentMonthPreventedWaste: state.currentMonthPreventedWaste,
      wastePreventionMultiplier: state.wastePreventionMultiplier,
    }
  },
}))

const syncFinanceStoreWithSources = () => {
  const multiplier = useFinanceStore.getState().wastePreventionMultiplier
  useFinanceStore.setState(buildFinanceSnapshot(multiplier))
}

syncFinanceStoreWithSources()

const unsubscribePantryStore = usePantryStore.subscribe(() => {
  syncFinanceStoreWithSources()
})

const unsubscribePlannerStore = usePlannerStore.subscribe(() => {
  syncFinanceStoreWithSources()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribePantryStore()
    unsubscribePlannerStore()
  })
}
