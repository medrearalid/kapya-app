import { useMemo, useRef, useState } from 'react'
import { Camera, LoaderCircle, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import EmptyStatePanel from '../components/empty-state-panel'
import GuidedAssistantWizard from '../components/guided-assistant-wizard'
import ReceiptReviewOverlay from '../components/receipt-review-overlay'
import RecipeInventoryHero from '../components/recipe-inventory-hero'
import TapButton from '../components/tap-button'
import { useBehaviorStore } from '../store/behavior-store'
import { KATEGORI_OPTIONS, productUnitOptions, usePantryStore } from '../store/pantry-store'
import { useRecipeStore } from '../store/recipe-store'
import { analyzeReceiptImage } from '../services/receipt-api'
import { generateRecipeByName } from '../services/recipe-agent-api'

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

const RECEIPT_UNIT_OPTIONS = new Set(['adet', 'gram', 'paket', 'litre', 'var'])

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

const normalizeText = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

const mergeUniqueLabels = (...valueLists) => {
  const uniqueMap = new Map()

  for (const list of valueLists) {
    for (const rawValue of Array.isArray(list) ? list : []) {
      const label = String(rawValue ?? '').trim()
      const key = normalizeText(label)
      if (!label || !key || uniqueMap.has(key)) {
        continue
      }

      uniqueMap.set(key, label)
    }
  }

  return Array.from(uniqueMap.values())
}

const normalizeGuidedContext = (guidedContext) => {
  if (!guidedContext || typeof guidedContext !== 'object' || Array.isArray(guidedContext)) {
    return null
  }

  const normalizedCookingTechnique = String(guidedContext?.cookingTechnique ?? '').trim()
  const normalizedDietGoal = String(guidedContext?.dietGoal ?? '').trim()

  return {
    category: String(guidedContext?.category ?? '').trim(),
    focusIngredients: Array.isArray(guidedContext?.focusIngredients)
      ? guidedContext.focusIngredients
      : [],
    cookingTechnique: normalizedCookingTechnique === 'fark_etmez' ? '' : normalizedCookingTechnique,
    dietGoal: normalizedDietGoal === 'fark_etmez' ? '' : normalizedDietGoal,
  }
}

const hasGuidedCriteria = (guidedContext) =>
  Boolean(guidedContext?.category) ||
  (Array.isArray(guidedContext?.focusIngredients) && guidedContext.focusIngredients.length > 0) ||
  Boolean(guidedContext?.cookingTechnique) ||
  Boolean(guidedContext?.dietGoal)

const resolveRecipeGenerationErrorMessage = (t, error) => {
  const isHallucination = error?.code === 'HALLUCINATION'
  if (isHallucination) {
    return {
      message:
        'Sef tarifte bir mantik hatasi yapti, en iyi sonucu vermek icin islemi iptal ettik. Lutfen tekrar deneyin.',
      isHallucination,
    }
  }

  if (error?.message && error.message !== 'RECIPE_BY_NAME_FAILED') {
    return { message: error.message, isHallucination }
  }

  return { message: t('pantry.recipeInventory.defaultError'), isHallucination }
}

function PantryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const products = usePantryStore((state) => state.products)
  const recentRecipeNames = usePantryStore((state) => state.recentRecipeNames)
  const addProduct = usePantryStore((state) => state.addProduct)
  const addRecentRecipeNames = usePantryStore((state) => state.addRecentRecipeNames)
  const addProductsBatch = usePantryStore((state) => state.addProductsBatch)
  const removeProduct = usePantryStore((state) => state.removeProduct)
  const updateProductQuantity = usePantryStore((state) => state.updateProductQuantity)
  const showToast = usePantryStore((state) => state.showToast)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)
  const startAgentProcess = useBehaviorStore((state) => state.startAgentProcess)
  const finishAgentProcess = useBehaviorStore((state) => state.finishAgentProcess)

  const [formValues, setFormValues] = useState(initialForm)
  const [pendingReceiptItems, setPendingReceiptItems] = useState([])
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(FILTER_ALL_VALUE)
  const [recipePrompt, setRecipePrompt] = useState('')
  const [portionSize, setPortionSize] = useState(2)
  const [recipeGenerationError, setRecipeGenerationError] = useState('')
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false)
  const [guidedCategory, setGuidedCategory] = useState('')
  const [guidedFocusIngredients, setGuidedFocusIngredients] = useState([])
  const [guidedCookingTechnique, setGuidedCookingTechnique] = useState('')
  const [guidedDietGoal, setGuidedDietGoal] = useState('')
  const [guidedStep, setGuidedStep] = useState(1)
  const [isGuidedWizardOpen, setIsGuidedWizardOpen] = useState(false)
  const [guidedWizardError, setGuidedWizardError] = useState('')
  const receiptInputRef = useRef(null)

  const inventoryStats = useMemo(() => {
    const totalValue = products.reduce(
      (sum, product) => sum + Math.max(0, Number(product?.fiyat) || 0),
      0,
    )

    const activeCount = products.filter(
      (product) =>
        Number(product?.quantity) > 0 && String(product?.status ?? '').trim() !== 'tukendi',
    ).length

    const urgentCount = products.filter((product) => {
      const daysLeft = getRemainingShelfLifeDays(product?.estimatedShelfLifeEndDate)
      return Number(product?.quantity) > 0 && Number.isFinite(daysLeft) && daysLeft <= 2
    }).length

    return {
      activeCount,
      urgentCount,
      totalValue: formatCurrencyTl(totalValue),
    }
  }, [products])

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

  const pantryIngredientOptions = useMemo(() => {
    const ingredientMap = new Map()

    for (const product of products) {
      const ingredientName = String(product?.name ?? '').trim()
      const key = normalizeText(ingredientName)
      if (!ingredientName || !key || ingredientMap.has(key)) {
        continue
      }

      ingredientMap.set(key, ingredientName)
    }

    return Array.from(ingredientMap.values()).sort((left, right) => left.localeCompare(right, 'tr'))
  }, [products])

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
    startAgentProcess()

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
      finishAgentProcess()
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
          unit: RECEIPT_UNIT_OPTIONS.has(item?.unit) ? item.unit : 'adet',
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

  const handleGenerateRecipe = async ({ luckyMode = false, guidedContext = null } = {}) => {
    if (isGeneratingRecipe) {
      return
    }

    const mealName = String(recipePrompt ?? '').trim()
    const normalizedGuidedContext = normalizeGuidedContext(guidedContext)
    const canGenerateFromGuidedContext = hasGuidedCriteria(normalizedGuidedContext)

    if (!luckyMode && !mealName && !canGenerateFromGuidedContext) {
      setRecipeGenerationError(t('pantry.recipeInventory.validationPrompt'))
      return
    }

    setRecipeGenerationError('')
    setIsGeneratingRecipe(true)
    startAgentProcess()

    try {
      const generatedRecipe = await generateRecipeByName({
        mealName,
        pantryStock: products,
        focusedIngredients: normalizedGuidedContext?.focusIngredients,
        dishCategory: normalizedGuidedContext?.category,
        guidedContext: normalizedGuidedContext,
        isLucky: luckyMode,
        recentRecipeNames,
        portionSize,
      })

      if (!generatedRecipe) {
        throw new Error('RECIPE_BY_NAME_FAILED')
      }

      if (mealName) {
        addRecentRecipeNames([mealName])
      }

      const savedRecipe = saveRecipe(generatedRecipe, {
        source: 'home-recipe-inventory',
      })

      if (savedRecipe?.id) {
        navigate(`/recipes/${savedRecipe.id}`, {
          state: {
            fromChefHub: true,
          },
        })
      }

      setRecipePrompt('')
      showToast(t('pantry.recipeInventory.successToast'))
    } catch (error) {
      const { message: displayMessage, isHallucination } = resolveRecipeGenerationErrorMessage(
        t,
        error,
      )

      setRecipeGenerationError(displayMessage)
      if (isHallucination) {
        showToast(displayMessage)
      }
    } finally {
      setIsGeneratingRecipe(false)
      finishAgentProcess()
    }
  }

  const toggleGuidedFocusIngredient = (ingredient) => {
    const normalizedIngredient = normalizeText(ingredient)
    if (!normalizedIngredient) {
      return
    }

    setGuidedFocusIngredients((currentIngredients) => {
      const alreadySelected = currentIngredients.some(
        (item) => normalizeText(item) === normalizedIngredient,
      )

      if (alreadySelected) {
        return currentIngredients.filter((item) => normalizeText(item) !== normalizedIngredient)
      }

      return [...currentIngredients, ingredient]
    })
  }

  const closeGuidedWizard = () => {
    setIsGuidedWizardOpen(false)
    setGuidedStep(1)
    setGuidedWizardError('')
  }

  const handleGuidedStepBack = () => {
    if (guidedStep === 1) {
      closeGuidedWizard()
      return
    }

    setGuidedWizardError('')
    setGuidedStep((currentStep) => Math.max(1, currentStep - 1))
  }

  const handleGuidedStepNext = () => {
    if (guidedStep === 1 && !guidedCategory) {
      setGuidedWizardError(t('recipes.guidedValidationCategory'))
      return
    }

    if (guidedStep === 3 && !guidedCookingTechnique) {
      setGuidedWizardError(t('recipes.guidedValidationTechnique'))
      return
    }

    setGuidedWizardError('')
    setGuidedStep((currentStep) => Math.min(4, currentStep + 1))
  }

  const handleGuidedSubmit = () => {
    if (!guidedCategory) {
      setGuidedWizardError(t('recipes.guidedValidationCategory'))
      return
    }

    if (!guidedCookingTechnique) {
      setGuidedWizardError(t('recipes.guidedValidationTechnique'))
      return
    }

    if (!guidedDietGoal) {
      setGuidedWizardError(t('recipes.guidedValidationDiet'))
      return
    }

    const selectedFocusedIngredients = mergeUniqueLabels(
      guidedFocusIngredients.filter((targetIngredient) =>
        pantryIngredientOptions.some(
          (ingredient) => normalizeText(ingredient) === normalizeText(targetIngredient),
        ),
      ),
    )

    closeGuidedWizard()

    handleGenerateRecipe({
      guidedContext: {
        category: guidedCategory,
        focusIngredients: selectedFocusedIngredients,
        cookingTechnique: guidedCookingTechnique,
        dietGoal: guidedDietGoal,
      },
    })
  }

  return (
    <section className="space-y-6 pb-8">
      <RecipeInventoryHero
        recipePrompt={recipePrompt}
        onRecipePromptChange={setRecipePrompt}
        portionSize={portionSize}
        onPortionSizeChange={setPortionSize}
        onGenerateRecipe={() => handleGenerateRecipe()}
        onGenerateLuckyRecipe={() => handleGenerateRecipe({ luckyMode: true })}
        onOpenGuidedWizard={() => {
          setGuidedCategory('')
          setGuidedFocusIngredients([])
          setGuidedCookingTechnique('')
          setGuidedDietGoal('')
          setIsGuidedWizardOpen(true)
          setGuidedStep(1)
          setGuidedWizardError('')
        }}
        isGeneratingRecipe={isGeneratingRecipe}
        recipeGenerationError={recipeGenerationError}
        stats={inventoryStats}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="feature-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4b4b4b]">
            {t('pantry.quickAddTitle', { defaultValue: 'Ürün Ekle' })}
          </h2>
          <p className="mt-1.5 text-xs text-[#737373]">
            {t('pantry.quickAddDescription', { defaultValue: 'Mutfak stokunuza manuel olarak yeni bir ürün ekleyin.' })}
          </p>
          <form className="mt-4 grid gap-2.5" onSubmit={handleSubmit}>
            <input
              name="name"
              type="text"
              value={formValues.name}
              onChange={handleInputChange}
              placeholder={t('pantry.namePlaceholder')}
              className="field-input"
              required
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-[1fr_1fr_1.2fr_1.5fr_auto]">
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formValues.quantity}
                onChange={handleInputChange}
                placeholder={t('pantry.quantityPlaceholder')}
                className="field-input"
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
                className="field-input"
              />
              <select
                name="unit"
                value={formValues.unit}
                onChange={handleInputChange}
                className="field-input"
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
                className="field-input"
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
                className="primary-action-btn col-span-2 inline-flex min-w-20 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold sm:col-span-4 md:col-span-1"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('pantry.addButton')}</span>
              </TapButton>
            </div>
          </form>

          <div className="mt-6 border-t border-black/5 pt-6">
            <div className="rounded-2xl border border-dashed border-[#d4d4d4] bg-[#fcfbfc] p-4 text-center transition-colors hover:border-[#171717]/30 dark:border-slate-700 dark:bg-slate-800/50">
            <TapButton
              type="button"
              onClick={handleUploadButtonClick}
              disabled={isAnalyzingReceipt}
              className="soft-highlight-btn flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAnalyzingReceipt ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {t('pantry.receipt.quickAddButton', {
                  defaultValue: t('pantry.receipt.fabButton'),
                })}
              </span>
            </TapButton>

            <p className="mt-2 text-[11px] text-[#737373]">
              {t('pantry.receipt.quickAddDescription')}
            </p>

            {isAnalyzingReceipt ? (
              <p className="mt-2 text-xs font-semibold text-[#4b4b4b] dark:text-slate-300">
                {t('pantry.receipt.loadingMessage')}
              </p>
            ) : null}

            {receiptError ? (
              <p className="mt-2 text-xs text-[#7e1c26] dark:text-rose-300">{receiptError}</p>
            ) : null}
            </div>
          </div>
        </article>

        <article className="feature-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4b4b4b]">
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
                        ? 'border-[#171717] bg-[#171717] text-white shadow-soft'
                        : 'border-black/10 bg-white text-[#4b4b4b] hover:bg-[#f4f1ee]'
                    }`}
                  >
                    {category.label}
                  </button>
                )
              })}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyStatePanel
              icon={ShoppingBasket}
              title={t('pantry.emptyStateTitle')}
              description={t('pantry.emptyStateDescription')}
              className="mt-4"
            />
          ) : (
            <div className="mt-4 max-h-[24rem] overflow-y-auto pr-1">
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
                            'flex flex-col gap-2 rounded-[20px] border border-black/10 bg-white p-3 shadow-soft',
                            isDepleted ? 'opacity-70 grayscale-[0.35]' : '',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-[#050505]">{product.name}</p>
                            <TapButton
                              type="button"
                              onClick={() => removeProduct(product.id)}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#f4f1ee] text-[#4b4b4b] transition hover:bg-[#ece7e2] hover:text-[#7e1c26]"
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
                            <span className="inline-flex w-fit rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4b4b4b]">
                              {t('pantry.depletedLabel')}
                            </span>
                          ) : null}

                          <div className="mt-auto flex justify-start">
                            <div className="inline-flex items-center gap-1 rounded-xl bg-[#f7f4f0] px-1.5 py-1">
                              <TapButton
                                type="button"
                                onClick={() => handleAdjustProductQuantity(product, -1)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white text-[#171717]"
                                aria-label={t('pantry.decreaseQuantityAria', { name: product.name })}
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              </TapButton>
                              <span className="min-w-12 text-center text-xs font-semibold text-[#050505]">
                                {product.quantity} {product.unit}
                              </span>
                              <TapButton
                                type="button"
                                onClick={() => handleAdjustProductQuantity(product, 1)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white text-[#171717]"
                                aria-label={t('pantry.increaseQuantityAria', { name: product.name })}
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </TapButton>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-[#4b4b4b]">
                              {t('pantry.totalCostLabel', { defaultValue: 'Toplam Deger' })}:{' '}
                              {formatCurrencyTl(product?.fiyat)}
                            </p>
                            <p className="text-[11px] text-[#737373]">
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
      </div>

      <ReceiptReviewOverlay
        isOpen={pendingReceiptItems.length > 0}
        pendingReceiptItems={pendingReceiptItems}
        onItemChange={handlePendingReceiptItemChange}
        onItemRemove={handlePendingReceiptItemRemove}
        onCancel={handleCancelReceiptReview}
        onConfirm={handleConfirmReceiptReview}
        receiptError={receiptError}
      />

      <GuidedAssistantWizard
        isOpen={isGuidedWizardOpen}
        step={guidedStep}
        selectedCategory={guidedCategory}
        selectedIngredients={guidedFocusIngredients}
        selectedCookingTechnique={guidedCookingTechnique}
        selectedDietGoal={guidedDietGoal}
        pantryIngredientOptions={pantryIngredientOptions}
        onSelectCategory={setGuidedCategory}
        onToggleIngredient={toggleGuidedFocusIngredient}
        onSelectCookingTechnique={setGuidedCookingTechnique}
        onSelectDietGoal={setGuidedDietGoal}
        onStepBack={handleGuidedStepBack}
        onStepNext={handleGuidedStepNext}
        onClose={closeGuidedWizard}
        onSubmit={handleGuidedSubmit}
        isGenerating={isGeneratingRecipe}
        errorMessage={guidedWizardError}
      />

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
