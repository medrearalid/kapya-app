import { create } from 'zustand'

const budgetProfileOptions = ['ogrenci', 'aile', 'luks']

const daysFromNow = (days) => {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)
  return targetDate.toISOString().slice(0, 10)
}

const normalize = (value) => String(value ?? '').trim().toLowerCase()

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

export const usePantryStore = create((set) => ({
  selectedBudgetProfile: 'ogrenci',
  products: defaultProducts,

  updateBudgetProfile: (profile) => {
    if (!budgetProfileOptions.includes(profile)) {
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