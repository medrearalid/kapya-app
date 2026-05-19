import { Clock3, Heart, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TapButton from './tap-button'

function ChefRecipeCard({ recipe, imageFallback, onToggleFavorite, favoriteAriaLabel, onDelete }) {
  const { t } = useTranslation()

  return (
    <article className="group relative w-full overflow-hidden rounded-[20px] border border-black/10 bg-white text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-700/55 dark:bg-slate-900/65">
      <Link
        to={`/recipes/${recipe.id}`}
        state={{ fromChefHub: true }}
        className="block w-full cursor-pointer outline-none"
        aria-label={String(recipe?.isim || '').trim()}
      >
        <img
          src={recipe.nanoBananaGorseli || imageFallback}
          alt={recipe.isim}
          className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = imageFallback
          }}
          loading="lazy"
        />

        <div className="space-y-1.5 p-3">
          <p className="line-clamp-2 break-words text-sm font-semibold text-[#050505] dark:text-slate-100">
            {recipe.isim}
          </p>

          {recipe.aciklama ? (
            <p className="line-clamp-3 break-words text-xs leading-relaxed text-[#4b4b4b] dark:text-slate-300">
              {recipe.aciklama}
            </p>
          ) : null}

          <p className="inline-flex items-center gap-1 rounded-full bg-[#f4f1ee] px-2 py-1 text-[11px] font-semibold text-[#4b4b4b] dark:bg-slate-800 dark:text-slate-200">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {recipe.sure}
          </p>
        </div>
      </Link>

      <TapButton
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onDelete(recipe)
        }}
        aria-label={t('recipes.deleteRecipeAria', { name: recipe.isim, defaultValue: 'Tarifi Sil' })}
        className="absolute right-14 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/85 text-[#4b4b4b] hover:text-rose-600 shadow-sm backdrop-blur dark:border-slate-600/70 dark:bg-slate-900/80 dark:text-slate-200"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </TapButton>

      <TapButton
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggleFavorite(recipe)
        }}
        aria-label={favoriteAriaLabel}
        className={[
          'absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur',
          recipe.isFavorite
            ? 'border-rose-200/80 bg-rose-500 text-white dark:border-rose-400/80'
            : 'border-black/10 bg-white/85 text-[#4b4b4b] dark:border-slate-600/70 dark:bg-slate-900/80 dark:text-slate-200',
        ].join(' ')}
      >
        <Heart
          className="h-4 w-4"
          aria-hidden="true"
          fill={recipe.isFavorite ? 'currentColor' : 'none'}
        />
      </TapButton>

      {recipe.isFavorite ? (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-[#171717]/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
          {t('recipes.favoritedButton')}
        </span>
      ) : null}
    </article>
  )
}

ChefRecipeCard.propTypes = {
  recipe: PropTypes.shape({
    id: PropTypes.string,
    isim: PropTypes.string,
    aciklama: PropTypes.string,
    sure: PropTypes.string,
    isFavorite: PropTypes.bool,
    nanoBananaGorseli: PropTypes.string,
  }).isRequired,
  imageFallback: PropTypes.string.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  favoriteAriaLabel: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
}

export default ChefRecipeCard
