import { create } from 'zustand'
import { usePantryStore } from './pantry-store'
import { usePlannerStore } from './planner-store'

const DEFAULT_WASTE_PREVENTION_MULTIPLIER = 1.5

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7)

const createEntityId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const daysFromNow = (days) => {
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

const createDemoProducts = () => {
  const now = Date.now()

  return [
    {
      id: createEntityId('demo-product'),
      name: 'Dana Kıyma',
      quantity: 500,
      status: 'active',
      fiyat: 240,
      birimMaliyet: 0.48,
      unit: 'gram',
      kategori: 'Et ve Tavuk',
      rafOmruGun: 3,
      estimatedShelfLifeEndDate: daysFromNow(3),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Tavuk Göğsü',
      quantity: 600,
      status: 'active',
      fiyat: 150,
      birimMaliyet: 0.25,
      unit: 'gram',
      kategori: 'Et ve Tavuk',
      rafOmruGun: 4,
      estimatedShelfLifeEndDate: daysFromNow(4),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Süt',
      quantity: 1,
      status: 'active',
      fiyat: 30,
      birimMaliyet: 30,
      unit: 'litre',
      kategori: 'Süt Ürünleri',
      rafOmruGun: 5,
      estimatedShelfLifeEndDate: daysFromNow(5),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Mantar',
      quantity: 400,
      status: 'active',
      fiyat: 45,
      birimMaliyet: 0.1125,
      unit: 'gram',
      kategori: 'Sebzeler',
      rafOmruGun: 4,
      estimatedShelfLifeEndDate: daysFromNow(4),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Domates',
      quantity: 6,
      status: 'active',
      fiyat: 42,
      birimMaliyet: 7,
      unit: 'adet',
      kategori: 'Sebzeler',
      rafOmruGun: 5,
      estimatedShelfLifeEndDate: daysFromNow(5),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Biber',
      quantity: 8,
      status: 'active',
      fiyat: 24,
      birimMaliyet: 3,
      unit: 'adet',
      kategori: 'Sebzeler',
      rafOmruGun: 6,
      estimatedShelfLifeEndDate: daysFromNow(6),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Soğan',
      quantity: 5,
      status: 'active',
      fiyat: 20,
      birimMaliyet: 4,
      unit: 'adet',
      kategori: 'Sebzeler',
      rafOmruGun: 10,
      estimatedShelfLifeEndDate: daysFromNow(10),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Pirinç',
      quantity: 1,
      status: 'active',
      fiyat: 68,
      birimMaliyet: 68,
      unit: 'paket',
      kategori: 'Temel Gıda',
      rafOmruGun: 180,
      estimatedShelfLifeEndDate: daysFromNow(180),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Bulgur',
      quantity: 1,
      status: 'active',
      fiyat: 40,
      birimMaliyet: 40,
      unit: 'paket',
      kategori: 'Temel Gıda',
      rafOmruGun: 180,
      estimatedShelfLifeEndDate: daysFromNow(180),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Zeytinyağı',
      quantity: 1,
      status: 'active',
      fiyat: 220,
      birimMaliyet: 220,
      unit: 'litre',
      kategori: 'Temel Gıda',
      rafOmruGun: 360,
      estimatedShelfLifeEndDate: daysFromNow(360),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Yoğurt',
      quantity: 1,
      status: 'active',
      fiyat: 55,
      birimMaliyet: 55,
      unit: 'paket',
      kategori: 'Süt Ürünleri',
      rafOmruGun: 7,
      estimatedShelfLifeEndDate: daysFromNow(7),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Tereyağı',
      quantity: 250,
      status: 'active',
      fiyat: 95,
      birimMaliyet: 0.38,
      unit: 'gram',
      kategori: 'Süt Ürünleri',
      rafOmruGun: 30,
      estimatedShelfLifeEndDate: daysFromNow(30),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Makarna',
      quantity: 2,
      status: 'active',
      fiyat: 30,
      birimMaliyet: 15,
      unit: 'paket',
      kategori: 'Temel Gıda',
      rafOmruGun: 180,
      estimatedShelfLifeEndDate: daysFromNow(180),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Kaşar Peyniri',
      quantity: 400,
      status: 'active',
      fiyat: 140,
      birimMaliyet: 0.35,
      unit: 'gram',
      kategori: 'Süt Ürünleri',
      rafOmruGun: 14,
      estimatedShelfLifeEndDate: daysFromNow(14),
      addedAt: now,
      updatedAt: now,
    },
    {
      id: createEntityId('demo-product'),
      name: 'Yumurta',
      quantity: 15,
      status: 'active',
      fiyat: 60,
      birimMaliyet: 4,
      unit: 'adet',
      kategori: 'Temel Gıda',
      rafOmruGun: 15,
      estimatedShelfLifeEndDate: daysFromNow(15),
      addedAt: now,
      updatedAt: now,
    },
  ]
}

const createDemoCompletedMeals = () => {
  const now = Date.now()

  return [
    {
      id: createEntityId('demo-meal'),
      date: daysFromNow(-2),
      mealType: 'aksam',
      portionSize: 2,
      recipe: {
        id: createEntityId('demo-recipe'),
        tarifAdi: 'Mantarli Makarna',
        kisaAciklama: 'Mantar ve sut ile hazirlanan pratik aksam yemegi.',
        tahminiSure: '25 dk',
        goruntuUrl: '',
        ortalamaKalori: '540',
        porsiyon: '2',
        zorluk: 'Kolay',
        pufNoktasi: ['Mantarlar suyunu salmadan yuksek ateste kavrulmali.'],
        matchedIngredients: [
          { isim: 'Makarna', miktar: '200', birim: 'gram' },
          { isim: 'Mantar', miktar: '250', birim: 'gram' },
          { isim: 'Sut', miktar: '250', birim: 'ml' },
        ],
        missingIngredients: [],
        pisirmeAdimlari: ['Makarnayi hasla.', 'Mantar ve sosu pisir.', 'Sosla birlestir.'],
        porsiyonMaliyetiTl: 58,
      },
      completed: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      completedAt: now - 1000 * 60 * 60 * 24 * 2,
    },
    {
      id: createEntityId('demo-meal'),
      date: daysFromNow(-1),
      mealType: 'ogle',
      portionSize: 3,
      recipe: {
        id: createEntityId('demo-recipe'),
        tarifAdi: 'Kiyma ve Pirinc Pilavi',
        kisaAciklama: 'Kiyma ve pirinc ile dengeli bir ogle menusu.',
        tahminiSure: '35 dk',
        goruntuUrl: '',
        ortalamaKalori: '620',
        porsiyon: '3',
        zorluk: 'Orta',
        pufNoktasi: ['Pirinci kavururken orta ates kullanin.'],
        matchedIngredients: [
          { isim: 'Dana Kiyma', miktar: '200', birim: 'gram' },
          { isim: 'Pirinc', miktar: '1', birim: 'paket' },
          { isim: 'Sogan', miktar: '1', birim: 'adet' },
        ],
        missingIngredients: [],
        pisirmeAdimlari: ['Sogani kavur.', 'Kiyma ekle.', 'Pirinci pisirerek birlestir.'],
        porsiyonMaliyetiTl: 72,
      },
      completed: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      completedAt: now - 1000 * 60 * 60 * 24,
    },
  ]
}

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

  const explicitFiyat = toCurrencyNumber(product?.fiyat)
  if (explicitFiyat > 0) {
    return explicitFiyat
  }

  const unitCost = toPositiveNumber(product?.birimMaliyet, 0)
  if (unitCost > 0) {
    return toCurrencyNumber(unitCost * quantity)
  }

  return 0
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

  injectDemoData: () => {
    const demoProducts = createDemoProducts()
    const demoCompletedMeals = createDemoCompletedMeals()
    const activeMultiplier = get().wastePreventionMultiplier
    const monthKey = getCurrentMonthKey()

    const demoKitchenSpend = toCurrencyNumber(
      demoProducts.reduce((total, product) => total + toCurrencyNumber(product?.fiyat), 0),
    )

    const demoConsumedCost = calculateTotalConsumedCost(demoCompletedMeals)
    const demoPreventedWaste = calculatePreventedWasteValue(
      demoConsumedCost,
      activeMultiplier,
    )

    usePantryStore.setState((state) => ({
      products: demoProducts,
      finance: {
        ...(state?.finance && typeof state.finance === 'object' ? state.finance : {}),
        monthlyKitchenSpend: {
          [monthKey]: demoKitchenSpend,
        },
        monthlyPreventedWaste: {
          [monthKey]: demoPreventedWaste,
        },
      },
    }))

    usePlannerStore.setState({
      plannedMeals: demoCompletedMeals,
    })

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
