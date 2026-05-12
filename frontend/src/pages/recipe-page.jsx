import {
  Clock3,
  Flame,
  LayoutGrid,
  List,
  LoaderCircle,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import TapButton from '../components/tap-button'
import { generateRecipeByName } from '../services/recipe-agent-api'
import { useRecipeStore } from '../store/recipe-store'

const RECIPE_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fcd34d"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#78350f">CHEF</text></svg>',
)}`

const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
}

function RecipePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const savedRecipes = useRecipeStore((state) => state.savedRecipes)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)

  const [queryText, setQueryText] = useState('')
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID)
  const [requestError, setRequestError] = useState('')
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)

  const recipeList = useMemo(
    () =>
      savedRecipes
        .slice()
        .sort((left, right) => Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0)),
    [savedRecipes],
  )

  const handleGenerateRecipeByName = async () => {
    const mealName = String(queryText ?? '').trim()
    if (!mealName || isLoadingRecipe) {
      return
    }

    setIsLoadingRecipe(true)
    setRequestError('')

    try {
      const generatedRecipe = await generateRecipeByName({ mealName })
      if (!generatedRecipe) {
        throw new Error('RECIPE_BY_NAME_FAILED')
      }

      const savedRecipe = saveRecipe(generatedRecipe, {
        source: 'manual-name-request',
      })

      setQueryText('')

      if (savedRecipe?.id) {
        navigate(`/recipes/${savedRecipe.id}`)
      }
    } catch (error) {
      setRequestError(
        error?.message === 'RECIPE_BY_NAME_FAILED'
          ? t('recipes.byNameError')
          : error?.message || t('recipes.byNameError'),
      )
    } finally {
      setIsLoadingRecipe(false)
    }
  }

  return (
    <section className="space-y-4 pb-20">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('recipes.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('recipes.chefAssistantTitle')}
        </h1>
      </header>

      <article className="glass-panel soft-card rounded-3xl border border-kapya-200/65 bg-gradient-to-br from-white via-kapya-50/50 to-sage-50/60 p-4 dark:border-kapya-900/45 dark:from-slate-900/70 dark:via-slate-900/70 dark:to-slate-900/70">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('recipes.namePromptTitle')}
        </p>

        <div className="mt-3 flex gap-2">
          <label className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder={t('recipes.namePromptPlaceholder')}
              className="w-full rounded-2xl border border-white/65 bg-white/80 py-3 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleGenerateRecipeByName()
                }
              }}
            />
          </label>

          <TapButton
            type="button"
            onClick={handleGenerateRecipeByName}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-kapya-600 px-4 py-3 text-sm font-semibold text-white hover:bg-kapya-700"
          >
            {isLoadingRecipe ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('recipes.byNameLoading')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t('recipes.byNameButton')}
              </>
            )}
          </TapButton>
        </div>

        {requestError ? (
          <p className="mt-2 text-xs text-kapya-900 dark:text-kapya-300">{requestError}</p>
        ) : null}
      </article>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          {t('recipes.libraryTitle', { count: recipeList.length })}
        </p>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/60">
          <TapButton
            type="button"
            onClick={() => setViewMode(VIEW_MODES.GRID)}
            className={[
              'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
              viewMode === VIEW_MODES.GRID
                ? 'bg-kapya-600 text-white'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            {t('recipes.viewGrid')}
          </TapButton>

          <TapButton
            type="button"
            onClick={() => setViewMode(VIEW_MODES.LIST)}
            className={[
              'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
              viewMode === VIEW_MODES.LIST
                ? 'bg-kapya-600 text-white'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            {t('recipes.viewList')}
          </TapButton>
        </div>
      </div>

      {recipeList.length === 0 ? (
        <article className="glass-panel soft-card rounded-2xl border border-white/50 bg-white/70 p-4 dark:border-slate-700/50 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('recipes.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('recipes.chefAssistantEmpty')}
          </p>
        </article>
      ) : viewMode === VIEW_MODES.GRID ? (
        <div className="grid grid-cols-2 gap-3">
          {recipeList.map((recipe) => (
            <TapButton
              key={recipe.id}
              type="button"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
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
                <p className="line-clamp-2 text-sm font-semibold">{recipe.isim}</p>
                <p className="mt-1 text-[11px] text-white/90">{recipe.sure}</p>
              </div>
            </TapButton>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {recipeList.map((recipe) => (
            <TapButton
              key={recipe.id}
              type="button"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
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
      )}
    </section>
  )
}

export default RecipePage