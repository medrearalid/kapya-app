import { Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import TapButton from './tap-button'

const RECEIPT_UNIT_OPTIONS = ['adet', 'gram', 'paket', 'litre', 'var']

function ReceiptReviewOverlay({
  isOpen,
  pendingReceiptItems,
  onItemChange,
  onItemRemove,
  onCancel,
  onConfirm,
  receiptError,
}) {
  const { t } = useTranslation()

  if (!isOpen) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        key="receipt-review-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      >
        <motion.button
          type="button"
          className="absolute inset-0"
          onClick={onCancel}
          aria-label={t('pantry.receipt.cancelReviewButton')}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="feature-card relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col border border-black/10 bg-white p-4 dark:border-slate-700/65 dark:bg-slate-900/95"
        >
          <div className="flex items-start justify-between gap-3 shrink-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b] dark:text-slate-400">
                {t('pantry.receipt.reviewTitle')}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-[#050505] dark:text-slate-100">
                {t('pantry.receipt.reviewDescription')}
              </h3>
            </div>
            <TapButton
              type="button"
              onClick={onCancel}
              className="soft-highlight-btn px-3 py-1.5 text-xs font-semibold"
            >
              {t('planner.cancelButton')}
            </TapButton>
          </div>

          {receiptError ? (
            <p className="mt-3 shrink-0 text-xs font-semibold text-[#7e1c26] dark:text-rose-300">
              {receiptError}
            </p>
          ) : null}

          <div className="no-scrollbar mt-4 flex-1 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {pendingReceiptItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-[20px] border border-black/10 bg-white p-3 shadow-soft dark:border-slate-700/60 dark:bg-slate-800"
                >
                  <div className="grid gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(event) => onItemChange(item.id, 'name', event.target.value)}
                      placeholder={t('pantry.namePlaceholder')}
                      className="field-input"
                    />
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) => onItemChange(item.id, 'quantity', event.target.value)}
                        placeholder={t('pantry.quantityPlaceholder')}
                        className="field-input"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(event) => onItemChange(item.id, 'price', event.target.value)}
                        placeholder={t('pantry.pricePlaceholder', { defaultValue: 'Fiyat (TL)' })}
                        className="field-input"
                      />
                      <select
                        value={item.unit}
                        onChange={(event) => onItemChange(item.id, 'unit', event.target.value)}
                        className="field-input"
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
                        onClick={() => onItemRemove(item.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f1ee] text-[#171717] dark:bg-slate-700 dark:text-slate-200"
                        aria-label={t('pantry.deleteProductAria', { name: item.name || 'urun' })}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </TapButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid shrink-0 grid-cols-2 gap-2">
            <TapButton
              type="button"
              onClick={onCancel}
              className="soft-highlight-btn inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
            >
              {t('pantry.receipt.cancelReviewButton')}
            </TapButton>
            <TapButton
              type="button"
              onClick={onConfirm}
              className="primary-action-btn inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
            >
              {t('pantry.receipt.confirmReviewButton')}
            </TapButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

ReceiptReviewOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  pendingReceiptItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      unit: PropTypes.string,
    })
  ).isRequired,
  onItemChange: PropTypes.func.isRequired,
  onItemRemove: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  receiptError: PropTypes.string,
}

ReceiptReviewOverlay.defaultProps = {
  receiptError: '',
}

export default ReceiptReviewOverlay
