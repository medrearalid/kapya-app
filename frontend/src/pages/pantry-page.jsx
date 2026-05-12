import { useMemo, useRef, useState } from 'react'
import { Camera, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TapButton from '../components/tap-button'
import { productUnitOptions, usePantryStore } from '../store/pantry-store'
import { analyzeReceiptImage } from '../services/receipt-api'

const initialForm = {
  name: '',
  quantity: '',
  unit: 'adet',
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

function PantryPage() {
  const { t } = useTranslation()
  const products = usePantryStore((state) => state.products)
  const addProduct = usePantryStore((state) => state.addProduct)
  const addProductsBatch = usePantryStore((state) => state.addProductsBatch)
  const removeProduct = usePantryStore((state) => state.removeProduct)
  const showToast = usePantryStore((state) => state.showToast)

  const [formValues, setFormValues] = useState(initialForm)
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const receiptInputRef = useRef(null)

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
    addProduct({
      name: formValues.name,
      quantity: formValues.quantity,
      unit: formValues.unit,
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
    if (!selectedFile) {
      return
    }

    setIsAnalyzingReceipt(true)
    setReceiptError('')

    try {
      const imageBase64 = await convertFileToBase64(selectedFile)
      const analyzedProducts = await analyzeReceiptImage({ imageBase64 })

      if (analyzedProducts.length === 0) {
        throw new Error('RECEIPT_ANALYZE_FAILED')
      }

      addProductsBatch(analyzedProducts)
      showToast(t('pantry.receipt.successToast'))
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

  const handleUploadButtonClick = () => {
    receiptInputRef.current?.click()
  }

  return (
    <section className="space-y-4 pb-20">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('pantry.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('pantry.title')}
        </h1>
      </header>

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
          <TapButton
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('pantry.addButton')}
          </TapButton>
        </form>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-sand-700 dark:text-slate-400">
          {t('pantry.listTitle')}
        </h2>
        {sortedProducts.length > 0 ? (
          <motion.ul
            className="mt-3 space-y-2"
            variants={listContainerVariants}
            initial="hidden"
            animate="show"
          >
            {sortedProducts.map((product) => (
              <motion.li
                key={product.id}
                variants={listItemVariants}
                className="glass-panel flex items-center justify-between rounded-xl border border-white/55 bg-white/62 px-3 py-2 dark:border-slate-700/65 dark:bg-slate-800/62"
              >
                <div>
                  <p className="text-sm font-semibold text-sand-900 dark:text-slate-100">
                    {t('pantry.productLine', {
                      quantity: product.quantity,
                      unit: product.unit,
                      name: product.name,
                    })}
                  </p>
                </div>
                <TapButton
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/75 text-kapya-700 dark:bg-slate-700/70 dark:text-kapya-200"
                  aria-label={t('pantry.deleteProductAria', { name: product.name })}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </TapButton>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <p className="mt-3 text-sm text-sand-700 dark:text-slate-300">{t('pantry.emptyState')}</p>
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

      <TapButton
        type="button"
        onClick={handleUploadButtonClick}
        disabled={isAnalyzingReceipt}
        className="animate-kapya-pulse fixed bottom-24 right-5 z-40 inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl bg-kapya-600 px-4 text-sm font-semibold text-white shadow-float transition hover:bg-kapya-700 disabled:animate-none disabled:bg-kapya-300"
      >
        {isAnalyzingReceipt ? (
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-5 w-5" aria-hidden="true" />
        )}
        <span>{t('pantry.receipt.fabButton')}</span>
      </TapButton>

      {isAnalyzingReceipt ? (
        <p className="text-xs font-semibold text-kapya-700 dark:text-kapya-300">
          {t('pantry.receipt.loadingMessage')}
        </p>
      ) : null}

      {receiptError ? <p className="text-xs text-kapya-800 dark:text-kapya-300">{receiptError}</p> : null}
    </section>
  )
}

export default PantryPage