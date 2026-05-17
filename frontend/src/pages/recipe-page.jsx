import {
  CakeSlice,
  Clock3,
  Flame,
  LayoutGrid,
  List,
  LoaderCircle,
  Soup,
  Search,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import TapButton from '../components/tap-button'
import { generateRecipeByName, generateWasteSaverRecipes } from '../services/recipe-agent-api'
import { usePantryStore } from '../store/pantry-store'
import { useRecipeStore } from '../store/recipe-store'

const RECIPE_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fcd34d"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#78350f">CHEF</text></svg>',
)}`

const COOKING_LOTTIE_SRC = '/Cooking.lottie'

const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
}

const PREFERENCE_OPTIONS = [
  {
    id: 'quick-15',
    labelKey: 'recipes.filterQuick15',
    icon: Clock3,
  },
  {
    id: 'high-protein',
    labelKey: 'recipes.filterHighProtein',
    icon: Flame,
  },
  {
    id: 'one-pot',
    labelKey: 'recipes.filterOnePot',
    icon: List,
  },
]

const GUIDED_CATEGORY_OPTIONS = [
  { id: 'ana_yemek', labelKey: 'recipes.guidedCategoryMainDish', icon: UtensilsCrossed },
  { id: 'corba', labelKey: 'recipes.guidedCategorySoup', icon: Soup },
  { id: 'tatli', labelKey: 'recipes.guidedCategoryDessert', icon: CakeSlice },
  { id: 'atistirmalik', labelKey: 'recipes.guidedCategorySnack', icon: Sparkles },
]

const LOADING_TEXT_KEYS = [
  'recipes.loadingInspectingPantry',
  'recipes.loadingCombiningIngredients',
  'recipes.loadingFinalizing',
]

const MS_PER_DAY = 1000 * 60 * 60 * 24

const normalizeText = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

const calculateDaysLeft = (dateValue) => {
  const targetDate = new Date(dateValue)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  )

  return Math.ceil((startOfTarget - startOfToday) / MS_PER_DAY)
}

const extractWasteSaverRecipe = (recipeData) => {
  if (recipeData?.tarif && typeof recipeData.tarif === 'object') {
    return recipeData.tarif
  }

  if (Array.isArray(recipeData?.tarifler)) {
    return recipeData.tarifler[0] || null
  }

  return null
}

const buildCategorizedIngredients = (products) => {
  const categoryMap = new Map()

  for (const product of Array.isArray(products) ? products : []) {
    const ingredientName = String(product?.name ?? '').trim()
    if (!ingredientName) {
      continue
    }

    const categoryName = String(product?.kategori ?? 'Diger').trim() || 'Diger'
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, new Map())
    }

    const bucket = categoryMap.get(categoryName)
    const ingredientKey = normalizeText(ingredientName)

    if (!bucket.has(ingredientKey)) {
      bucket.set(ingredientKey, ingredientName)
    }
  }

  return Array.from(categoryMap.entries())
    .map(([category, ingredientMap]) => ({
      category,
      ingredients: Array.from(ingredientMap.values()).sort((left, right) =>
        left.localeCompare(right, 'tr'),
      ),
    }))
    .sort((left, right) => left.category.localeCompare(right.category, 'tr'))
}

function OptionCard({
  title,
  description,
  icon: Icon,
  onClick,
  isActive,
  disabled = false,
  loading = false,
  loadingLabel = 'Loading',
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={[
        'glass-panel group relative overflow-hidden rounded-3xl border p-4 text-left transition',
        isActive
          ? 'border-kapya-300 bg-kapya-50/55 shadow-float dark:border-kapya-700 dark:bg-kapya-900/35'
          : 'border-white/60 bg-white/55 hover:border-kapya-200 dark:border-slate-700/65 dark:bg-slate-900/65',
        disabled ? 'cursor-not-allowed opacity-70' : '',
      ].join(' ')}
    >
      {loading ? (
        <div className="flex min-h-[94px] items-center justify-center">
          <DotLottieReact
            src={COOKING_LOTTIE_SRC}
            loop
            autoplay
            className="h-32 w-32 bg-transparent"
            aria-label={loadingLabel}
          />
        </div>
      ) : (
        <>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/75 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800/75 dark:text-slate-200">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{title}</span>
          </div>

          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{description}</p>
        </>
      )}

      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-kapya-100/55 blur-2xl transition group-hover:bg-kapya-200/65 dark:bg-kapya-900/20" />
    </motion.button>
  )
}

OptionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  onClick: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
}

function GuidedAssistantWizard({
  isOpen,
  step,
  selectedCategory,
  selectedIngredient,
  pantryIngredientOptions,
  preferences,
  onSelectCategory,
  onSelectIngredient,
  onTogglePreference,
  onStepBack,
  onStepNext,
  onClose,
  onSubmit,
  isGenerating,
  t,
}) {
  if (!isOpen) {
    return null
  }

  const selectedPreferenceSet = new Set(preferences)

  return (
    <AnimatePresence>
      <>
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px]"
          onClick={onClose}
          aria-label={t('planner.cancelButton')}
        />

        <motion.dialog
          open
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed left-1/2 top-1/2 z-50 w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/65 bg-white/95 p-4 shadow-soft dark:border-slate-700/65 dark:bg-slate-900/95"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('recipes.guidedAssistantTitle')}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                {t(`recipes.guidedStep${step}Title`)}
              </h3>
            </div>
            <TapButton
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {t('planner.cancelButton')}
            </TapButton>
          </div>

          {step === 1 ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {GUIDED_CATEGORY_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = selectedCategory === option.id

                return (
                  <TapButton
                    key={option.id}
                    type="button"
                    onClick={() => onSelectCategory(option.id)}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                      isSelected
                        ? 'border-kapya-600 bg-kapya-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-kapya-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(option.labelKey)}
                  </TapButton>
                )
              })}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-3">
              {pantryIngredientOptions.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t('recipes.focusedIngredientsEmpty')}
                </p>
              ) : (
                <div className="flex max-h-[240px] flex-wrap gap-2 overflow-y-auto pr-1">
                  {pantryIngredientOptions.map((ingredient) => {
                    const isSelected = selectedIngredient === ingredient
                    return (
                      <TapButton
                        key={ingredient}
                        type="button"
                        onClick={() => onSelectIngredient(ingredient)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          isSelected
                            ? 'border-kapya-600 bg-kapya-600 text-white'
                            : 'border-white/70 bg-white/80 text-slate-700 hover:border-kapya-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                        ].join(' ')}
                      >
                        {ingredient}
                      </TapButton>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PREFERENCE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = selectedPreferenceSet.has(option.id)
                return (
                  <TapButton
                    key={option.id}
                    type="button"
                    onClick={() => onTogglePreference(option.id)}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                      isSelected
                        ? 'border-kapya-600 bg-kapya-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-kapya-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(option.labelKey)}
                  </TapButton>
                )
              })}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <TapButton
              type="button"
              onClick={onStepBack}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {step === 1 ? t('planner.cancelButton') : t('recipes.guidedBackButton')}
            </TapButton>

            <TapButton
              type="button"
              onClick={step === 3 ? onSubmit : onStepNext}
              disabled={isGenerating}
              className="rounded-xl bg-kapya-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {step === 3 ? t('recipes.guidedCreateButton') : t('recipes.guidedNextButton')}
            </TapButton>
          </div>
        </motion.dialog>
      </>
    </AnimatePresence>
  )
}

GuidedAssistantWizard.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  step: PropTypes.oneOf([1, 2, 3]).isRequired,
  selectedCategory: PropTypes.string,
  selectedIngredient: PropTypes.string,
  pantryIngredientOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  preferences: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectCategory: PropTypes.func.isRequired,
  onSelectIngredient: PropTypes.func.isRequired,
  onTogglePreference: PropTypes.func.isRequired,
  onStepBack: PropTypes.func.isRequired,
  onStepNext: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
}

function ChefSuggestionCard({ recipe, onOpenDetail, t }) {
  const matchedCount = Array.isArray(recipe?.matchedIngredients) ? recipe.matchedIngredients.length : 0
  const missingCount = Array.isArray(recipe?.missingIngredients) ? recipe.missingIngredients.length : 0

  return (
    <TapButton
      type="button"
      onClick={onOpenDetail}
      className="mx-auto block w-full max-w-2xl rounded-[2rem] text-left"
    >
      <article className="overflow-hidden rounded-[2rem] border border-white/65 bg-white/80 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="relative">
          <img
            src={recipe?.goruntuUrl || RECIPE_IMAGE_PLACEHOLDER}
            alt={recipe?.tarifAdi || 'Sefin Onerisi'}
            className="h-[320px] w-full object-cover sm:h-[420px]"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = RECIPE_IMAGE_PLACEHOLDER
            }}
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
              {t('recipes.chefSuggestionTitle')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{recipe?.tarifAdi}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-white/90 sm:text-base">{recipe?.kisaAciklama}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4 sm:p-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {recipe?.tahminiSure || '-'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            {t('recipes.matchedCountBadge', { count: matchedCount })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
            {t('recipes.missingCountBadge', { count: missingCount })}
          </span>
        </div>
      </article>
    </TapButton>
  )
}

ChefSuggestionCard.propTypes = {
  recipe: PropTypes.shape({
    tarifAdi: PropTypes.string,
    kisaAciklama: PropTypes.string,
    tahminiSure: PropTypes.string,
    goruntuUrl: PropTypes.string,
    matchedIngredients: PropTypes.array,
    missingIngredients: PropTypes.array,
  }).isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

function RecipeLibrarySection({ recipeList, viewMode, setViewMode, onSelectRecipe, t }) {
  const isLibraryEmpty = recipeList.length === 0
  const isGridMode = viewMode === VIEW_MODES.GRID

  let libraryContent
  if (isLibraryEmpty) {
    libraryContent = (
      <article className="glass-panel soft-card rounded-2xl border border-white/50 bg-white/70 p-4 dark:border-slate-700/50 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('recipes.emptyTitle')}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t('recipes.chefAssistantEmpty')}
        </p>
      </article>
    )
  } else if (isGridMode) {
    libraryContent = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recipeList.map((recipe) => (
          <TapButton
            key={recipe.id}
            type="button"
            onClick={() => onSelectRecipe(recipe.id)}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-white/55 bg-white/70 text-left dark:border-slate-700/55 dark:bg-slate-900/65"
          >
            <img
              src={recipe.nanoBananaGorseli || RECIPE_IMAGE_PLACEHOLDER}
              alt={recipe.isim}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = RECIPE_IMAGE_PLACEHOLDER
              }}
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 text-white">
              <p className="line-clamp-2 break-words text-sm font-semibold leading-tight">{recipe.isim}</p>
              <p className="mt-1 text-[11px] text-white/90">{recipe.sure}</p>
            </div>
          </TapButton>
        ))}
      </div>
    )
  } else {
    libraryContent = (
      <div className="space-y-2">
        {recipeList.map((recipe) => (
          <TapButton
            key={recipe.id}
            type="button"
            onClick={() => onSelectRecipe(recipe.id)}
            className="glass-panel soft-card flex w-full items-center gap-3 rounded-2xl border border-white/55 bg-white/75 p-2.5 text-left dark:border-slate-700/55 dark:bg-slate-900/65"
          >
            <img
              src={recipe.nanoBananaGorseli || RECIPE_IMAGE_PLACEHOLDER}
              alt={recipe.isim}
              className="h-20 w-20 rounded-xl object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = RECIPE_IMAGE_PLACEHOLDER
              }}
              loading="lazy"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {recipe.isim}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                {recipe.aciklama}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {recipe.sure}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  {recipe.kalori}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {recipe.porsiyon}
                </span>
              </div>
            </div>
          </TapButton>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          {t('recipes.libraryTitle', { count: recipeList.length })}
        </p>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/60">
          <TapButton
            type="button"
            onClick={() => setViewMode(VIEW_MODES.GRID)}
            className="relative inline-flex items-center gap-1 overflow-hidden rounded-lg px-2 py-1.5 text-xs font-semibold transition"
          >
            {viewMode === VIEW_MODES.GRID ? (
              <motion.div
                layoutId="viewToggle"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-kapya-600 to-kapya-500 dark:from-kapya-700 dark:to-kapya-600"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}

            <span
              className={[
                'relative z-10 inline-flex items-center gap-1',
                viewMode === VIEW_MODES.GRID ? 'text-white' : 'text-slate-700 dark:text-slate-200',
              ].join(' ')}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              {t('recipes.viewGrid')}
            </span>
          </TapButton>

          <TapButton
            type="button"
            onClick={() => setViewMode(VIEW_MODES.LIST)}
            className="relative inline-flex items-center gap-1 overflow-hidden rounded-lg px-2 py-1.5 text-xs font-semibold transition"
          >
            {viewMode === VIEW_MODES.LIST ? (
              <motion.div
                layoutId="viewToggle"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-kapya-600 to-kapya-500 dark:from-kapya-700 dark:to-kapya-600"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}

            <span
              className={[
                'relative z-10 inline-flex items-center gap-1',
                viewMode === VIEW_MODES.LIST ? 'text-white' : 'text-slate-700 dark:text-slate-200',
              ].join(' ')}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              {t('recipes.viewList')}
            </span>
          </TapButton>
        </div>
      </div>

      {libraryContent}
    </>
  )
}

RecipeLibrarySection.propTypes = {
  recipeList: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      isim: PropTypes.string,
      sure: PropTypes.string,
      kalori: PropTypes.string,
      porsiyon: PropTypes.string,
      aciklama: PropTypes.string,
      nanoBananaGorseli: PropTypes.string,
    }),
  ).isRequired,
  viewMode: PropTypes.string.isRequired,
  setViewMode: PropTypes.func.isRequired,
  onSelectRecipe: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

function RecipePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const pantryProducts = usePantryStore((state) => state.products)
  const recentRecipeNames = usePantryStore((state) => state.recentRecipeNames)
  const generatedRecipes = usePantryStore((state) => state.generatedRecipes)
  const addRecentRecipeNames = usePantryStore((state) => state.addRecentRecipeNames)
  const setGeneratedRecipes = usePantryStore((state) => state.setGeneratedRecipes)
  const setAgentInsight = usePantryStore((state) => state.setAgentInsight)
  const showToast = usePantryStore((state) => state.showToast)
  const savedRecipes = useRecipeStore((state) => state.savedRecipes)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)

  const [queryText, setQueryText] = useState('')
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID)
  const [focusedIngredients, setFocusedIngredients] = useState([])
  const [preferences, setPreferences] = useState([])
  const [guidedCategory, setGuidedCategory] = useState('')
  const [guidedIngredient, setGuidedIngredient] = useState('')
  const [guidedStep, setGuidedStep] = useState(1)
  const [isGuidedWizardOpen, setIsGuidedWizardOpen] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)
  const [isRefreshingChefSuggestion, setIsRefreshingChefSuggestion] = useState(false)
  const [loadingStepIndex, setLoadingStepIndex] = useState(0)
  const [loadingSource, setLoadingSource] = useState('')

  const loadingTexts = useMemo(() => LOADING_TEXT_KEYS.map((key) => t(key)), [t])
  const categorizedIngredients = useMemo(
    () => buildCategorizedIngredients(pantryProducts),
    [pantryProducts],
  )
  const pantryIngredientOptions = useMemo(
    () =>
      categorizedIngredients
        .flatMap((group) => group.ingredients)
        .filter((name, index, array) => array.findIndex((item) => normalizeText(item) === normalizeText(name)) === index)
        .sort((left, right) => left.localeCompare(right, 'tr')),
    [categorizedIngredients],
  )
  const selectedPreferenceLabels = useMemo(
    () =>
      preferences
        .map(
          (preference) =>
            t(PREFERENCE_OPTIONS.find((option) => option.id === preference)?.labelKey || ''),
        )
        .filter(Boolean),
    [preferences, t],
  )
  const selectedGuidedCategoryLabel = useMemo(() => {
    const option = GUIDED_CATEGORY_OPTIONS.find((item) => item.id === guidedCategory)
    return option ? t(option.labelKey) : ''
  }, [guidedCategory, t])
  const featuredRecipe = useMemo(
    () => (Array.isArray(generatedRecipes) ? generatedRecipes[0] || null : null),
    [generatedRecipes],
  )
  const urgentProducts = useMemo(
    () =>
      pantryProducts.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft >= 0 && daysLeft <= 2
      }),
    [pantryProducts],
  )

  const recipeList = useMemo(
    () =>
      savedRecipes
        .slice()
        .sort((left, right) => Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0)),
    [savedRecipes],
  )
  const recentRecipeHints = useMemo(() => {
    const uniqueMap = new Map()

    for (const name of recentRecipeNames) {
      const label = String(name ?? '').trim()
      const key = normalizeText(label)
      if (!label || !key || uniqueMap.has(key)) {
        continue
      }
      uniqueMap.set(key, label)
    }

    for (const recipe of recipeList) {
      const label = String(recipe?.isim ?? '').trim()
      const key = normalizeText(label)
      if (!label || !key || uniqueMap.has(key)) {
        continue
      }
      uniqueMap.set(key, label)
    }

    return Array.from(uniqueMap.values()).slice(0, 20)
  }, [recentRecipeNames, recipeList])

  useEffect(() => {
    if (!isLoadingRecipe) {
      return undefined
    }

    const intervalId = globalThis.window.setInterval(() => {
      setLoadingStepIndex((currentStepIndex) => (currentStepIndex + 1) % LOADING_TEXT_KEYS.length)
    }, 1300)

    return () => {
      globalThis.window.clearInterval(intervalId)
    }
  }, [isLoadingRecipe])

  const handleOpenFeaturedRecipe = () => {
    if (!featuredRecipe || typeof featuredRecipe !== 'object') {
      return
    }

    const savedRecipe = saveRecipe(featuredRecipe, {
      source: 'waste-saver',
    })

    if (savedRecipe?.id) {
      navigate(`/recipes/${savedRecipe.id}`)
    }
  }

  const handleRefreshChefSuggestion = async () => {
    if (isRefreshingChefSuggestion) {
      return
    }

    const currentRecipeName = String(featuredRecipe?.tarifAdi ?? '').trim()
    if (!currentRecipeName) {
      return
    }

    setRefreshError('')
    setIsRefreshingChefSuggestion(true)

    addRecentRecipeNames([currentRecipeName])

    const requestRecentRecipeNames = [...recentRecipeNames, currentRecipeName]
      .map((name) => String(name ?? '').trim())
      .filter(Boolean)

    const agentInstruction =
      urgentProducts.length > 0
        ? 'Bu acil urunleri merkeze alarak israf onleyici tarif uret.'
        : 'Mutfaktaki urunleri kullanarak profile uygun gunluk bir tarif uret.'
    const requestMode = urgentProducts.length > 0 ? 'waste-prevent' : 'daily-profile'

    try {
      const recipeData = await generateWasteSaverRecipes({
        budgetProfile: selectedBudgetProfile,
        pantryStock: pantryProducts,
        urgentProducts,
        agentInstruction,
        requestMode,
        recentRecipeNames: requestRecentRecipeNames,
      })

      const nextRecipe = extractWasteSaverRecipe(recipeData)
      if (!nextRecipe) {
        throw new Error('RECIPE_GENERATION_FAILED')
      }

      saveRecipe(nextRecipe, {
        source: 'waste-saver',
      })
      setGeneratedRecipes([nextRecipe])
      setAgentInsight({
        tasarrufEdilenTutar: Number(recipeData?.tasarrufEdilenTutar) || 0,
        ajanMesaji: String(recipeData?.ajanMesaji ?? '').trim(),
      })
    } catch (error) {
      const isHallucination = error?.code === 'HALLUCINATION'
      let displayMessage = t('recipes.refreshError')
      if (isHallucination) {
        displayMessage = 'Şef tarifte bir mantık hatası yaptı, en iyi sonucu vermek için işlemi iptal ettik. Lütfen tekrar deneyin.'
      } else if (error?.message && error.message !== 'RECIPE_GENERATION_FAILED') {
        displayMessage = error.message
      }
      setRefreshError(displayMessage)
      if (isHallucination) {
        showToast(displayMessage)
      }
    } finally {
      setIsRefreshingChefSuggestion(false)
    }
  }

  const togglePreference = (preferenceId) => {
    setPreferences((currentPreferences) => {
      if (currentPreferences.includes(preferenceId)) {
        return currentPreferences.filter((item) => item !== preferenceId)
      }

      return [...currentPreferences, preferenceId]
    })
  }

  const closeGuidedWizard = () => {
    setIsGuidedWizardOpen(false)
    setGuidedStep(1)
  }

  const handleOpenGuidedWizard = () => {
    setIsGuidedWizardOpen(true)
    setGuidedStep(1)
    setRequestError('')
  }

  const handleGuidedStepBack = () => {
    if (guidedStep === 1) {
      closeGuidedWizard()
      return
    }

    setGuidedStep((currentStep) => Math.max(1, currentStep - 1))
  }

  const handleGuidedStepNext = () => {
    if (guidedStep === 1 && !guidedCategory) {
      setRequestError(t('recipes.guidedValidationCategory'))
      return
    }

    setRequestError('')
    setGuidedStep((currentStep) => Math.min(3, currentStep + 1))
  }

  const handleGenerateRecipeByName = async ({
    luckyMode = false,
    source = 'general',
    overrideFocusedIngredients,
    overridePreferences,
    overrideDishCategory,
  } = {}) => {
    const mealName = String(queryText ?? '').trim()
    const appliedFocusedIngredients = Array.isArray(overrideFocusedIngredients)
      ? overrideFocusedIngredients
      : focusedIngredients
    const appliedPreferences = Array.isArray(overridePreferences) ? overridePreferences : preferences
    const appliedDishCategory = String(overrideDishCategory ?? '').trim()

    if (isLoadingRecipe) {
      return
    }

    if (
      !mealName &&
      appliedFocusedIngredients.length === 0 &&
      appliedPreferences.length === 0 &&
      !appliedDishCategory &&
      !luckyMode
    ) {
      setRequestError(t('recipes.smartHubValidation'))
      return
    }

    setLoadingStepIndex(0)
    setIsLoadingRecipe(true)
    setLoadingSource(source)
    setRequestError('')

    try {
      const generatedRecipe = await generateRecipeByName({
        mealName,
        pantryStock: pantryProducts,
        focusedIngredients: appliedFocusedIngredients,
        preferences: appliedPreferences,
        dishCategory: appliedDishCategory,
        isLucky: luckyMode,
        recentRecipeNames: recentRecipeHints,
      })

      if (!generatedRecipe) {
        throw new Error('RECIPE_BY_NAME_FAILED')
      }

      const savedRecipe = saveRecipe(generatedRecipe, {
        source: luckyMode ? 'lucky-chef-hub' : 'smart-chef-hub',
      })

      if (savedRecipe?.id) {
        navigate(`/recipes/${savedRecipe.id}`, {
          state: {
            fromChefHub: true,
          },
        })
      }
    } catch (error) {
      const isHallucination = error?.code === 'HALLUCINATION'
      let displayMessage = t('recipes.byNameError')
      if (isHallucination) {
        displayMessage = 'Şef tarifte bir mantık hatası yaptı, en iyi sonucu vermek için işlemi iptal ettik. Lütfen tekrar deneyin.'
      } else if (error?.message && error.message !== 'RECIPE_BY_NAME_FAILED') {
        displayMessage = error.message
      }
      setRequestError(displayMessage)
      if (isHallucination) {
        showToast(displayMessage)
      }
    } finally {
      setIsLoadingRecipe(false)
      setLoadingSource('')
    }
  }

  const handleGuidedSubmit = () => {
    if (!guidedCategory) {
      setRequestError(t('recipes.guidedValidationCategory'))
      return
    }

    const hasGuidedIngredient = pantryIngredientOptions.some(
      (ingredient) => normalizeText(ingredient) === normalizeText(guidedIngredient),
    )

    const selectedFocusedIngredients = hasGuidedIngredient && guidedIngredient ? [guidedIngredient] : []

    setFocusedIngredients(selectedFocusedIngredients)

    closeGuidedWizard()

    handleGenerateRecipeByName({
      source: 'guided-assistant',
      overrideFocusedIngredients: selectedFocusedIngredients,
      overridePreferences: preferences,
      overrideDishCategory: guidedCategory,
    })
  }

  const isLuckyCardLoading = isLoadingRecipe && loadingSource === 'lucky'
  const isGuidedCardLoading = isLoadingRecipe && loadingSource === 'guided-assistant'

  return (
    <section className="space-y-4 pb-20 md:pb-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('recipes.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('recipes.smartHubTitle')}
        </h1>
      </header>

      {featuredRecipe ? (
        <section className="space-y-3">
          <ChefSuggestionCard recipe={featuredRecipe} onOpenDetail={handleOpenFeaturedRecipe} t={t} />

          <TapButton
            type="button"
            onClick={handleRefreshChefSuggestion}
            disabled={isRefreshingChefSuggestion}
            className="mx-auto inline-flex w-full max-w-2xl items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-80 dark:bg-kapya-700 dark:hover:bg-kapya-600"
          >
            {isRefreshingChefSuggestion ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('recipes.refreshLoading')}
              </>
            ) : (
              t('recipes.refreshButton')
            )}
          </TapButton>

          {refreshError ? (
            <p className="mx-auto max-w-2xl text-xs font-semibold text-kapya-900 dark:text-kapya-300">
              {refreshError}
            </p>
          ) : null}
        </section>
      ) : null}

      <article className="glass-panel rounded-3xl border border-white/60 bg-white/65 p-3 dark:border-slate-700/65 dark:bg-slate-900/70">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
          {t('recipes.quickSearchLabel')}
        </p>
        <label className="relative mt-2 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder={t('recipes.quickSearchPlaceholder')}
            className="w-full rounded-2xl border border-white/75 bg-white/80 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleGenerateRecipeByName()
              }
            }}
          />
        </label>
      </article>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('recipes.chefOptionsTitle')}
          </h2>
          <span className="rounded-full bg-kapya-50 px-2.5 py-1 text-[11px] font-semibold text-kapya-800 dark:bg-kapya-900/35 dark:text-kapya-200">
            {t('recipes.selectedBadge', {
              count:
                preferences.length +
                focusedIngredients.length +
                (guidedCategory ? 1 : 0),
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OptionCard
            title={t('recipes.guidedAssistantCardTitle')}
            description={t('recipes.guidedAssistantCardDescription')}
            icon={Search}
            onClick={handleOpenGuidedWizard}
            isActive={isGuidedWizardOpen || Boolean(guidedCategory) || focusedIngredients.length > 0}
            disabled={isLoadingRecipe}
            loading={isGuidedCardLoading}
            loadingLabel={loadingTexts[loadingStepIndex]}
          />

          <OptionCard
            title={`🎲 ${t('recipes.luckyCardTitle')}`}
            description={t('recipes.luckyCardDescription')}
            icon={Sparkles}
            onClick={() => handleGenerateRecipeByName({ luckyMode: true, source: 'lucky' })}
            isActive={false}
            disabled={isLoadingRecipe}
            loading={isLuckyCardLoading}
            loadingLabel={loadingTexts[loadingStepIndex]}
          />
        </div>

        {selectedGuidedCategoryLabel || focusedIngredients.length > 0 || selectedPreferenceLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedGuidedCategoryLabel ? (
              <span className="rounded-full border border-kapya-200 bg-kapya-50 px-3 py-1 text-xs font-semibold text-kapya-800 dark:border-kapya-700 dark:bg-kapya-900/30 dark:text-kapya-200">
                {selectedGuidedCategoryLabel}
              </span>
            ) : null}

            {focusedIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full border border-kapya-200 bg-kapya-50 px-3 py-1 text-xs font-semibold text-kapya-800 dark:border-kapya-700 dark:bg-kapya-900/30 dark:text-kapya-200"
              >
                {ingredient}
              </span>
            ))}

            {selectedPreferenceLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-kapya-200 bg-kapya-50 px-3 py-1 text-xs font-semibold text-kapya-800 dark:border-kapya-700 dark:bg-kapya-900/30 dark:text-kapya-200"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        {requestError ? (
          <p className="text-xs font-semibold text-kapya-900 dark:text-kapya-300">{requestError}</p>
        ) : null}
      </section>

      <RecipeLibrarySection
        recipeList={recipeList}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onSelectRecipe={(recipeId) => navigate(`/recipes/${recipeId}`)}
        t={t}
      />

      <GuidedAssistantWizard
        isOpen={isGuidedWizardOpen}
        step={guidedStep}
        selectedCategory={guidedCategory}
        selectedIngredient={guidedIngredient}
        pantryIngredientOptions={pantryIngredientOptions}
        preferences={preferences}
        onSelectCategory={setGuidedCategory}
        onSelectIngredient={setGuidedIngredient}
        onTogglePreference={togglePreference}
        onStepBack={handleGuidedStepBack}
        onStepNext={handleGuidedStepNext}
        onClose={closeGuidedWizard}
        onSubmit={handleGuidedSubmit}
        isGenerating={isGuidedCardLoading}
        t={t}
      />
    </section>
  )
}

export default RecipePage