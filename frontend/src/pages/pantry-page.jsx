import { useMemo, useRef, useState } from 'react'
import { Camera, LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TapButton from '../components/tap-button'
import { KATEGORI_OPTIONS, productUnitOptions, usePantryStore } from '../store/pantry-store'
import { analyzeReceiptImage } from '../services/receipt-api'

const initialForm = {
  name: '',
  quantity: '',
  price: '',
  unit: 'adet',
  kategori: 'Diğer',
}

const FILTER_ALL_VALUE = 'all'

const CATEGORY_PILLS = [
  { value: FILTER_ALL_VALUE, label: 'Tümü' },
  { value: 'Sebzeler', label: 'Sebzeler' },
  { value: 'Et ve Tavuk', label: 'Et & Tavuk' },
  { value: 'Süt Ürünleri', label: 'Süt Ürünleri' },
  { value: 'Temel Gıda', label: 'Temel Gıda' },
  { value: 'Meyveler', label: 'Meyveler' },
  { value: 'Diğer', label: 'Diğer' },
]

const roundToTwo = (value) => Number(value.toFixed(2))

const toSanitizedFloat = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN
  }

  const normalized = String(value ?? '')
    .trim()
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

  const fallback = Number.parseFloat(normalized)
  return Number.isFinite(fallback) ? fallback : Number.NaN
}

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
    price: String(item?.price ?? item?.fiyat ?? ''),
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

const getRemainingShelfLifeDays = (estimatedEndDate) => {
  const endDate = new Date(estimatedEndDate)
  if (Number.isNaN(endDate.getTime())) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)
  return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const getShelfLifeMeta = (daysLeft, fallbackDays) => {
  if (!Number.isFinite(daysLeft)) {
    return {
      label: `⏳ Tüketim önerisi: ${fallbackDays} gün`,
      toneClass: 'text-slate-500 dark:text-slate-300',
      badgeClass: 'bg-slate-100/80 dark:bg-slate-700/60',
    }
  }

  if (daysLeft <= 0) {
    return {
      label: '🚨 Son gün!',
      toneClass: 'text-rose-700 dark:text-rose-300',
      badgeClass: 'bg-rose-100/80 dark:bg-rose-900/40',
    }
  }

  if (daysLeft <= 2) {
    return {
      label: `🚨 Son ${daysLeft} gün!`,
      toneClass: 'text-orange-700 dark:text-orange-300',
      badgeClass: 'bg-orange-100/80 dark:bg-orange-900/40',
    }
  }

  return {
    label: `⏳ Raf ömrü: ${daysLeft} gün`,
    toneClass: 'text-emerald-700 dark:text-emerald-300',
    badgeClass: 'bg-emerald-100/80 dark:bg-emerald-900/35',
  }
}

const formatCurrencyTl = (value) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(Math.max(0, Number(value) || 0))

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
  const [selectedCategory, setSelectedCategory] = useState(FILTER_ALL_VALUE)
  const receiptInputRef = useRef(null)

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const aDepleted = String(a?.status ?? '').trim() === 'tukendi' || Number(a?.quantity) <= 0
        const bDepleted = String(b?.status ?? '').trim() === 'tukendi' || Number(b?.quantity) <= 0
        if (aDepleted !== bDepleted) {
          return aDepleted ? 1 : -1
        }

        return a.name.localeCompare(b.name, 'tr')
      }),
    [products],
  )

  const filteredProducts = useMemo(() => {
    if (selectedCategory === FILTER_ALL_VALUE) {
      return sortedProducts
    }

    return sortedProducts.filter((product) => (product?.kategori || 'Diğer') === selectedCategory)
  }, [selectedCategory, sortedProducts])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    addProduct({
      name: formValues.name,
      quantity: formValues.quantity,
      price: formValues.price,
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
        const quantity = toSanitizedFloat(item?.quantity)
        const price = toSanitizedFloat(item?.price)
        const shelfLifeDays = Number(item?.estimatedShelfLifeDays)
        if (!name || !Number.isFinite(quantity) || quantity <= 0) return null

        const safeQuantity = Number(quantity.toFixed(2))
        const safePrice = Number.isFinite(price) && price > 0 ? Number(price.toFixed(2)) : 0

        return {
          name,
          quantity: safeQuantity,
          price: safePrice,
          unit: RECEIPT_UNIT_OPTIONS.includes(item?.unit) ? item.unit : 'adet',
          estimatedShelfLifeDays:
            Number.isFinite(shelfLifeDays) && shelfLifeDays > 0 ? Math.round(shelfLifeDays) : 7,
          kategori: item?.kategori || 'Diğer',
        }
      })
      .filter(Boolean)

    if (normalizedItems.length === 0) {
      setReceiptError(t('pantry.receipt.reviewValidationError'))
      return
    }

    addProductsBatch(normalizedItems, { source: 'receipt' })
    setPendingReceiptItems([])
    setReceiptError('')
    showToast(t('pantry.receipt.successToast'))
  }

  const handleAdjustProductQuantity = (product, direction) => {
    const baseQuantity = Number(product?.quantity)
    if (!Number.isFinite(baseQuantity)) return

    const step = getQuantityStepByUnit(product?.unit)
    const nextQuantity = roundToTwo(baseQuantity + step * direction)
    updateProductQuantity({ id: product.id, quantity: Math.max(0, nextQuantity) })
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

      <div className="sticky top-2 z-20 -mx-1 px-1">
        <TapButton
          type="button"
          onClick={handleUploadButtonClick}
          disabled={isAnalyzingReceipt}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/50 bg-rose-500/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/15 transition hover:bg-rose-500 dark:border-rose-300/30 dark:bg-rose-400/80 dark:text-slate-900 dark:hover:bg-rose-300 disabled:bg-rose-200"
        >
          {isAnalyzingReceipt ? (
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-5 w-5" aria-hidden="true" />
          )}
          <span>{t('pantry.receipt.fabButton')}</span>
        </TapButton>
      </div>

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
          {t('pantry.quickAddTitle', { defaultValue: 'Hızlı Ürün Ekle' })}
        </h2>
        <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
          <input
            name="name"
            type="text"
            value={formValues.name}
            onChange={handleInputChange}
            placeholder={t('pantry.namePlaceholder')}
            className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 placeholder:text-sand-400 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:placeholder:text-slate-400"
            required
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
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
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formValues.price}
              onChange={handleInputChange}
              placeholder={t('pantry.pricePlaceholder', { defaultValue: 'Fiyat (TL)' })}
              className="w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2.5 text-sm text-sand-900 outline-none ring-kapya-200 placeholder:text-sand-400 focus:ring-2 dark:border-slate-600/75 dark:bg-slate-800/65 dark:text-slate-100 dark:placeholder:text-slate-400"
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
              className="inline-flex min-w-20 items-center justify-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-300 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('pantry.addButton')}</span>
            </TapButton>
          </div>
        </form>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700 dark:text-slate-400">
          {t('pantry.listTitle')}
        </h2>

        <div className="no-scrollbar mt-3 -mx-1 overflow-x-auto px-1">
          <div className="flex w-max min-w-full gap-2 pb-1">
            {CATEGORY_PILLS.map((category) => {
              const isActive = selectedCategory === category.value
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-kapya-500 bg-kapya-600 text-white shadow-md shadow-kapya-700/15'
                      : 'border-slate-200/80 bg-slate-100/75 text-slate-700 hover:bg-slate-200/80 dark:border-slate-600/80 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700/80'
                  }`}
                >
                  {category.label}
                </button>
              )
            })}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="mt-4 text-sm text-sand-700 dark:text-slate-300">{t('pantry.emptyState')}</p>
        ) : (
          <div className="mt-3 max-h-[24rem] overflow-y-auto pr-1">
            <AnimatePresence mode="wait">
              <motion.ul
                key={selectedCategory}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <AnimatePresence initial={false}>
                  {filteredProducts.map((product) => {
                    const fallbackShelfLifeDays = Number(product?.rafOmruGun) || 7
                    const daysLeft = getRemainingShelfLifeDays(product?.estimatedShelfLifeEndDate)
                    const shelfLifeMeta = getShelfLifeMeta(daysLeft, fallbackShelfLifeDays)
                    const isDepleted =
                      String(product?.status ?? '').trim() === 'tukendi' || Number(product?.quantity) <= 0

                    return (
                      <motion.li
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 14 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className={[
                          'glass-panel flex flex-col gap-2 rounded-xl bg-white/58 p-3 shadow-sm dark:bg-slate-800/58',
                          isDepleted ? 'border border-slate-300/70 opacity-70 grayscale-[0.45] dark:border-slate-600/80' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
                            {product.name}
                          </p>
                          <TapButton
                            type="button"
                            onClick={() => removeProduct(product.id)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/60 text-slate-500 transition hover:bg-white/90 hover:text-rose-600 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-rose-300"
                            aria-label={t('pantry.deleteProductAria', { name: product.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </TapButton>
                        </div>

                        <span
                          className={`inline-flex rounded-xl px-2 py-0.5 text-xs font-medium ${shelfLifeMeta.badgeClass} ${shelfLifeMeta.toneClass}`}
                        >
                          {shelfLifeMeta.label}
                        </span>

                        {isDepleted ? (
                          <span className="inline-flex w-fit rounded-full bg-slate-400/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:bg-slate-500/20 dark:text-slate-200">
                            {t('pantry.depletedLabel')}
                          </span>
                        ) : null}

                        <div className="mt-auto flex justify-start">
                          <div className="inline-flex items-center gap-1 rounded-xl bg-white/70 px-1.5 py-1 shadow-sm dark:bg-slate-700/70">
                            <TapButton
                              type="button"
                              onClick={() => handleAdjustProductQuantity(product, -1)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white/85 text-kapya-700 dark:bg-slate-800 dark:text-kapya-200"
                              aria-label={t('pantry.decreaseQuantityAria', { name: product.name })}
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </TapButton>
                            <span className="min-w-12 text-center text-xs font-semibold text-sand-900 dark:text-slate-100">
                              {product.quantity} {product.unit}
                            </span>
                            <TapButton
                              type="button"
                              onClick={() => handleAdjustProductQuantity(product, 1)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white/85 text-kapya-700 dark:bg-slate-800 dark:text-kapya-200"
                              aria-label={t('pantry.increaseQuantityAria', { name: product.name })}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </TapButton>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {t('pantry.totalCostLabel', { defaultValue: 'Toplam Değer' })}:{' '}
                            {formatCurrencyTl(product?.fiyat)}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t('pantry.unitCostLabel', { defaultValue: 'Birim Maliyet' })}:{' '}
                            {formatCurrencyTl(product?.birimMaliyet || 0)} / {product.unit}
                          </p>
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </motion.ul>
            </AnimatePresence>
          </div>
        )}
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
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
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
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(event) =>
                        handlePendingReceiptItemChange(item.id, 'price', event.target.value)
                      }
                      placeholder={t('pantry.pricePlaceholder', { defaultValue: 'Fiyat (TL)' })}
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
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/75 text-kapya-700 dark:bg-slate-700/70 dark:text-kapya-200"
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
