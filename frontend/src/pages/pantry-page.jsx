import { useMemo, useRef, useState } from 'react'
import { Camera, LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TapButton from '../components/tap-button'
import { KATEGORI_OPTIONS, productUnitOptions, usePantryStore } from '../store/pantry-store'
import { analyzeReceiptImage } from '../services/receipt-api'

const initialForm = {
  name: '',
  quantity: '',
  unit: 'adet',
  kategori: 'Diğer',
}

const listContainerVariants = {
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const listItemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

const roundToTwo = (value) => Number(value.toFixed(2))

const createDraftReceiptId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `receipt-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const toDraftReceiptItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    id: createDraftReceiptId(),
    name: String(item?.name ?? '').trim(),
    quantity: String(item?.quantity ?? ''),
    unit: String(item?.unit ?? 'adet').trim() || 'adet',
    estimatedShelfLifeDays: Number(item?.estimatedShelfLifeDays ?? 7),
    kategori: String(item?.kategori ?? '').trim() || 'Diğer',
  }))

const getQuantityStepByUnit = (unit) => {
  if (unit === 'gram') {
    return 50
  }

  if (unit === 'litre') {
    return 0.25
  }

  return 1
}

const RECEIPT_UNIT_OPTIONS = ['adet', 'gram', 'paket', 'litre', 'var']

const CATEGORY_ORDER = [
  'Sebzeler',
  'Meyveler',
  'Et ve Tavuk',
  'S\u00fct \u00dcr\u00fcnleri',
  'Baharatlar',
  'Temel G\u0131da',
  'At\u0131\u015ft\u0131rmal\u0131klar',
  'Di\u011fer',
]

function PantryPage() {
  const { t } = useTranslation()
  const products = usePantryStore((state) => state.products)
  const addProduct = usePantryStore((state) => state.addProduct)
  const addProductsBatch = usePantryStore((state) => state.addProductsBatch)
  const removeProduct = usePantryStore((state) => state.removeProduct)
  const updateProductQuantity = usePantryStore((state) => state.updateProductQuantity)
  const showToast = usePantryStore((state) => state.showToast)

  const [formValues, setFormValues] = useState(initialForm)
  const [pendingReceiptItems, setPendingReceiptItems] = useState([])
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const receiptInputRef = useRef(null)

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [products],
  )

  const groupedProducts = useMemo(() => {
    const groups = {}
    sortedProducts.forEach((p) => {
      const key = p.kategori || 'Di\u011fer'
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    const ordered = CATEGORY_ORDER.filter((cat) => groups[cat]).map((cat) => [cat, groups[cat]])
    const extra = Object.entries(groups).filter(([k]) => !CATEGORY_ORDER.includes(k))
    return [...ordered, ...extra]
  }, [sortedProducts])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    addProduct({
      name: formValues.name,
      quantity: formValues.quantity,
      unit: formValues.unit,
      kategori: formValues.kategori,
    })
    setFormValues(initialForm)
  }

  const convertFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('RECEIPT_FILE_READ_FAILED'))
          return
        }

        resolve(reader.result)
      }
      reader.onerror = () => reject(new Error('RECEIPT_FILE_READ_FAILED'))
      reader.readAsDataURL(file)
    })

  const handleReceiptPick = async (event) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    if (!selectedFile) return

    setIsAnalyzingReceipt(true)
    setReceiptError('')

    try {
      const imageBase64 = await convertFileToBase64(selectedFile)
      const analyzedProducts = await analyzeReceiptImage({ imageBase64 })

      if (analyzedProducts.length === 0) throw new Error('RECEIPT_ANALYZE_FAILED')

      setPendingReceiptItems(toDraftReceiptItems(analyzedProducts))
    } catch (error) {
      const isKnownReceiptError =
        error?.message === 'RECEIPT_ANALYZE_FAILED' ||
        error?.message === 'RECEIPT_FILE_READ_FAILED' ||
        error?.message === 'RECEIPT_NETWORK_ERROR'
      const translationKey =
        error?.message === 'RECEIPT_NETWORK_ERROR'
          ? 'pantry.receipt.networkError'
          : 'pantry.receipt.defaultError'

      setReceiptError(
        isKnownReceiptError
          ? t(translationKey)
          : error?.message || t('pantry.receipt.defaultError'),
      )
    } finally {
      setIsAnalyzingReceipt(false)
    }
  }

  const handlePendingReceiptItemChange = (id, field, value) => {
    setPendingReceiptItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const handlePendingReceiptItemRemove = (id) => {
    setPendingReceiptItems((current) => current.filter((item) => item.id !== id))
  }

  const handleCancelReceiptReview = () => {
    setPendingReceiptItems([])
  }

  const handleConfirmReceiptReview = () => {
    const normalizedItems = pendingReceiptItems
      .map((item) => {
        const name = String(item?.name ?? '').trim()
        const quantity = Number(item?.quantity)
        const shelfLifeDays = Number(item?.estimatedShelfLifeDays)
        if (!name || !Number.isFinite(quantity) || quantity <= 0) return null

        return {
          name,
          quantity,
          unit: RECEIPT_UNIT_OPTIONS.includes(item?.unit) ? item.unit : 'adet',
          estimatedShelfLifeDays:
            Number.isFinite(shelfLifeDays) && shelfLifeDays > 0 ? Math.round(shelfLifeDays) : 7,
          kategori: item?.kategori || 'Di\u011fer',
        }
      })
      .filter(Boolean)

    if (normalizedItems.length === 0) {
      setReceiptError(t('pantry.receipt.reviewValidationError'))
      return
    }

    addProductsBatch(normalizedItems)
    setPendingReceiptItems([])
    setReceiptError('')
    showToast(t('pantry.receipt.successToast'))
  }

  const handleAdjustProductQuantity = (product, direction) => {
    const baseQuantity = Number(product?.quantity)
    if (!Number.isFinite(baseQuantity)) return

    const step = getQuantityStepByUnit(product?.unit)
    const nextQuantity = roundToTwo(baseQuantity + step * direction)
    if (nextQuantity <= 0) {
      removeProduct(product.id)
      return
    }

    updateProductQuantity({ id: product.id, quantity: nextQuantity })
  }

  const handleUploadButtonClick = () => {
    receiptInputRef.current?.click()
  }

  return (
    <section className="space-y-4 pb-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('pantry.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('pantry.title')}
        </h1>
      </header>

      <TapButton
        type="button"
        onClick={handleUploadButtonClick}
        disabled={isAnalyzingReceipt}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-kapya-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-kapya-700 disabled:bg-kapya-300"
      >
        {isAnalyzingReceipt ? (
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-5 w-5" aria-hidden="true" />
        )}
        <span>{t('pantry.receipt.fabButton')}</span>
      </TapButton>

      {isAnalyzingReceipt ? (
        <p className="text-center text-xs font-semibold text-kapya-700 dark:text-kapya-300">
          {t('pantry.receipt.loadingMessage')}
        </p>
      ) : null}

      {receiptError ? (
        <p className="text-center text-xs text-kapya-800 dark:text-kapya-300">{receiptError}</p>
      ) : null}

      <article className="glass-panel soft-card rounded-2xl p-4">
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
            className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 placeholder:text-sand-400 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:placeholder:text-slate-400"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={formValues.quantity}
              onChange={handleInputChange}
              placeholder={t('pantry.quantityPlaceholder')}
              className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 placeholder:text-sand-400 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
            <select
              name="unit"
              value={formValues.unit}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100"
              aria-label={t('pantry.unitLabel')}
            >
              {productUnitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`pantry.units.${unit}`)}
                </option>
              ))}
            </select>
          </div>
          <select
            name="kategori"
            value={formValues.kategori}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100"
            aria-label={t('pantry.categoryLabel')}
          >
            {KATEGORI_OPTIONS.map((kat) => (
              <option key={kat} value={kat}>
                {kat}
              </option>
            ))}
          </select>
          <TapButton
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('pantry.addButton')}
          </TapButton>
        </form>
      </article>

      {pendingReceiptItems.length > 0 ? (
        <article className="glass-panel soft-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700 dark:text-slate-400">
            {t('pantry.receipt.reviewTitle')}
          </h2>
          <p className="mt-2 text-xs text-sand-700 dark:text-slate-300">
            {t('pantry.receipt.reviewDescription')}
          </p>

          <ul className="mt-3 space-y-2">
            {pendingReceiptItems.map((item) => (
              <li
                key={item.id}
                className="glass-panel rounded-xl border border-white/55 bg-white/62 p-3 dark:border-slate-700/65 dark:bg-slate-800/62"
              >
                <div className="grid gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      handlePendingReceiptItemChange(item.id, 'name', event.target.value)
                    }
                    placeholder={t('pantry.namePlaceholder')}
                    className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 placeholder:text-sand-400 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) =>
                        handlePendingReceiptItemChange(item.id, 'quantity', event.target.value)
                      }
                      placeholder={t('pantry.quantityPlaceholder')}
                      className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 placeholder:text-sand-400 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                    <select
                      value={item.unit}
                      onChange={(event) =>
                        handlePendingReceiptItemChange(item.id, 'unit', event.target.value)
                      }
                      className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100"
                      aria-label={t('pantry.unitLabel')}
                    >
                      {RECEIPT_UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {t(`pantry.units.${unit}`, { defaultValue: unit })}
                        </option>
                      ))}
                    </select>
                    <TapButton
                      type="button"
                      onClick={() => handlePendingReceiptItemRemove(item.id)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/75 text-kapya-700 dark:bg-slate-700/70 dark:text-kapya-200"
                      aria-label={t('pantry.deleteProductAria', { name: item.name || 'urun' })}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </TapButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <TapButton
              type="button"
              onClick={handleCancelReceiptReview}
              className="inline-flex items-center justify-center rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-semibold text-sand-800 transition hover:bg-white dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {t('pantry.receipt.cancelReviewButton')}
            </TapButton>
            <TapButton
              type="button"
              onClick={handleConfirmReceiptReview}
              className="inline-flex items-center justify-center rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700"
            >
              {t('pantry.receipt.confirmReviewButton')}
            </TapButton>
          </div>
        </article>
      ) : null}

      <article className="glass-panel soft-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700 dark:text-slate-400">
          {t('pantry.listTitle')}
        </h2>
        {sortedProducts.length === 0 ? (
          <p className="mt-3 text-sm text-sand-700 dark:text-slate-300">{t('pantry.emptyState')}</p>
        ) : (
          <div className="mt-2 space-y-4">
            {groupedProducts.map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sand-500 dark:text-slate-500">
                  {category}
                </h3>
                <motion.ul
                  className="space-y-1.5"
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {items.map((product) => (
                    <motion.li
                      key={product.id}
                      variants={listItemVariants}
                      className="glass-panel flex items-center justify-between rounded-xl border border-white/55 bg-white/62 px-3 py-2 dark:border-slate-700/65 dark:bg-slate-800/62"
                    >
                      <p className="text-sm font-medium text-sand-900 dark:text-slate-100">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-white/50 bg-white/70 px-1.5 py-1 dark:border-slate-600/70 dark:bg-slate-700/70">
                          <TapButton
                            type="button"
                            onClick={() => handleAdjustProductQuantity(product, -1)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-kapya-700 dark:bg-slate-800 dark:text-kapya-200"
                            aria-label={t('pantry.decreaseQuantityAria', { name: product.name })}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </TapButton>
                          <span className="min-w-16 text-center text-xs font-semibold text-sand-900 dark:text-slate-100">
                            {product.quantity} {product.unit}
                          </span>
                          <TapButton
                            type="button"
                            onClick={() => handleAdjustProductQuantity(product, 1)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-kapya-700 dark:bg-slate-800 dark:text-kapya-200"
                            aria-label={t('pantry.increaseQuantityAria', { name: product.name })}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </TapButton>
                        </div>
                        <TapButton
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/75 text-kapya-700 dark:bg-slate-700/70 dark:text-kapya-200"
                          aria-label={t('pantry.deleteProductAria', { name: product.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </TapButton>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            ))}
          </div>
        )}
      </article>

      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReceiptPick}
      />
    </section>
  )
}

export default PantryPage