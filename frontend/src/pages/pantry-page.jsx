import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  budgetProfiles,
  getBudgetProfileLabelKey,
  usePantryStore,
} from '../store/pantry-store'

const initialForm = {
  name: '',
  quantity: '',
  unit: 'adet',
  estimatedShelfLifeEndDate: '',
}

function PantryPage() {
  const { t } = useTranslation()
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('pantry.badge')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-900 dark:text-slate-100 sm:text-3xl">
          {t('pantry.title')}
        </h1>
      </header>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
        <label
          className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700 dark:text-slate-400"
          htmlFor="budget-profile"
        >
          {t('pantry.budgetProfile')}
        </label>
        <select
          id="budget-profile"
          value={selectedBudgetProfile}
          onChange={(event) => updateBudgetProfile(event.target.value)}
          className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {budgetProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {t(getBudgetProfileLabelKey(profile.id))}
            </option>
          ))}
        </select>
      </article>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700 dark:text-slate-400">
          {t('pantry.addProductTitle')}
        </h2>
        <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
          <input
            name="name"
            type="text"
            value={formValues.name}
            onChange={handleInputChange}
            placeholder={t('pantry.namePlaceholder')}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="quantity"
              type="number"
              min="1"
              value={formValues.quantity}
              onChange={handleInputChange}
              placeholder={t('pantry.quantityPlaceholder')}
              className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
            <input
              name="unit"
              type="text"
              value={formValues.unit}
              onChange={handleInputChange}
              placeholder={t('pantry.unitPlaceholder')}
              className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </div>
          <input
            name="estimatedShelfLifeEndDate"
            type="date"
            value={formValues.estimatedShelfLifeEndDate}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sand-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('pantry.addButton')}
          </button>
        </form>
      </article>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700 dark:text-slate-400">
          {t('pantry.listTitle')}
        </h2>
        <ul className="mt-3 space-y-2">
          {sortedProducts.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between rounded-xl border border-sand-100 bg-sand-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70"
            >
              <div>
                <p className="text-sm font-semibold text-sand-900 dark:text-slate-100">{product.name}</p>
                <p className="text-xs text-sand-700 dark:text-slate-300">
                  {t('pantry.productLine', {
                    quantity: product.quantity,
                    unit: product.unit,
                    date: product.estimatedShelfLifeEndDate,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sand-700 dark:bg-slate-700 dark:text-slate-200"
                aria-label={t('pantry.deleteProductAria', { name: product.name })}
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