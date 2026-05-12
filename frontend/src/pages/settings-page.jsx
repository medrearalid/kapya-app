import { Globe, MoonStar, RotateCcw, WalletCards } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TapButton from '../components/tap-button'
import {
  budgetProfiles,
  getBudgetProfileLabelKey,
  usePantryStore,
} from '../store/pantry-store'

const LANGUAGE_STORAGE_KEY = 'kapya-language'

function SettingsPage() {
  const { t, i18n } = useTranslation()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const updateBudgetProfile = usePantryStore((state) => state.updateBudgetProfile)
  const currentTheme = usePantryStore((state) => state.currentTheme)
  const setTheme = usePantryStore((state) => state.setTheme)
  const resetAllData = usePantryStore((state) => state.resetAllData)

  const activeLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'tr'

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value
    i18n.changeLanguage(nextLanguage)

    if (globalThis.window) {
      globalThis.window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    }
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('settings.badge')}
        </p>
        <h1 className="heading-display text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('settings.title')}
        </h1>
      </header>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
          <WalletCards className="h-4 w-4 text-kapya-600" aria-hidden="true" />
          {t('settings.budgetProfile')}
        </div>

        <select
          value={selectedBudgetProfile}
          onChange={(event) => updateBudgetProfile(event.target.value)}
          className="mt-3 w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm text-sand-900 outline-none ring-kapya-200 focus:ring-2 dark:border-slate-600/70 dark:bg-slate-800/65 dark:text-slate-100"
        >
          {budgetProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {t(getBudgetProfileLabelKey(profile.id))}
            </option>
          ))}
        </select>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
          <MoonStar className="h-4 w-4 text-sage-600" aria-hidden="true" />
          {t('settings.theme')}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/70 p-1 dark:bg-slate-800/65">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme('light')}
            className={[
              'rounded-lg px-3 py-2 text-sm font-semibold transition',
              currentTheme === 'light'
                ? 'bg-kapya-500 text-white shadow-soft'
                : 'text-sand-700 dark:text-slate-300',
            ].join(' ')}
          >
            {t('settings.themeLight')}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme('dark')}
            className={[
              'rounded-lg px-3 py-2 text-sm font-semibold transition',
              currentTheme === 'dark'
                ? 'bg-slate-night text-white shadow-soft'
                : 'text-sand-700 dark:text-slate-300',
            ].join(' ')}
          >
            {t('settings.themeDark')}
          </motion.button>
        </div>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
          <Globe className="h-4 w-4 text-sage-600" aria-hidden="true" />
          {t('settings.language')}
        </div>

        <select
          value={activeLanguage}
          onChange={handleLanguageChange}
          className="mt-3 w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm text-sand-900 outline-none ring-kapya-200 focus:ring-2 dark:border-slate-600/70 dark:bg-slate-800/65 dark:text-slate-100"
        >
          <option value="tr">Turkce</option>
          <option value="en">English</option>
        </select>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <TapButton
          type="button"
          onClick={resetAllData}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-kapya-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-kapya-700"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('settings.resetData')}
        </TapButton>
      </article>
    </section>
  )
}

export default SettingsPage
