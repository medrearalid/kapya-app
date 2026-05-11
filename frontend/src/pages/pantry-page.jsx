import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { budgetProfiles, usePantryStore } from '../store/pantry-store'

const initialForm = {
  name: '',
  quantity: '',
  unit: 'adet',
  estimatedShelfLifeEndDate: '',
}

function PantryPage() {
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)
  const addProduct = usePantryStore((state) => state.addProduct)
  const removeProduct = usePantryStore((state) => state.removeProduct)
  const updateBudgetProfile = usePantryStore((state) => state.updateBudgetProfile)

  const [formValues, setFormValues] = useState(initialForm)

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [products],
  )

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    addProduct(formValues)
    setFormValues(initialForm)
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700">Kiler</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-900 sm:text-3xl">Stok Giris / Cikis</h1>
      </header>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700" htmlFor="budget-profile">
          Butce Profili
        </label>
        <select
          id="budget-profile"
          value={selectedBudgetProfile}
          onChange={(event) => updateBudgetProfile(event.target.value)}
          className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900"
        >
          {budgetProfiles.map((profile) => (
            <option key={profile} value={profile}>
              {profile}
            </option>
          ))}
        </select>
      </article>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700">Yeni Urun Ekle</h2>
        <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
          <input
            name="name"
            type="text"
            value={formValues.name}
            onChange={handleInputChange}
            placeholder="Urun adi"
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="quantity"
              type="number"
              min="1"
              value={formValues.quantity}
              onChange={handleInputChange}
              placeholder="Miktar"
              className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400"
              required
            />
            <input
              name="unit"
              type="text"
              value={formValues.unit}
              onChange={handleInputChange}
              placeholder="Birim"
              className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400"
              required
            />
          </div>
          <input
            name="estimatedShelfLifeEndDate"
            type="date"
            value={formValues.estimatedShelfLifeEndDate}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sand-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Urun Ekle
          </button>
        </form>
      </article>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700">Mutfak Urunleri</h2>
        <ul className="mt-3 space-y-2">
          {sortedProducts.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between rounded-xl border border-sand-100 bg-sand-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-sand-900">{product.name}</p>
                <p className="text-xs text-sand-700">
                  {product.quantity} {product.unit} - {product.estimatedShelfLifeEndDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sand-700"
                aria-label={`${product.name} urununu sil`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}

export default PantryPage