import { FlaskConical, Globe, RotateCcw, Trash2, WalletCards, Check, Languages, ShieldAlert, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TapButton from '../components/tap-button'
import { useFinanceStore } from '../store/finance-store'
import {
  budgetProfiles,
  getBudgetProfileLabelKey,
  usePantryStore,
} from '../store/pantry-store'
import { useRecipeStore } from '../store/recipe-store'

const LANGUAGE_STORAGE_KEY = 'kapya-language'

function SettingsPage() {
  const { t, i18n } = useTranslation()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const updateBudgetProfile = usePantryStore((state) => state.updateBudgetProfile)
  const resetAllData = usePantryStore((state) => state.resetAllData)
  const clearGeneratedRecipes = usePantryStore((state) => state.clearGeneratedRecipes)
  const clearRecentRecipes = usePantryStore((state) => state.clearRecentRecipes)
  const showToast = usePantryStore((state) => state.showToast)
  const developerMode = usePantryStore((state) => state.developerMode)
  const toggleDeveloperMode = usePantryStore((state) => state.toggleDeveloperMode)
  const injectDemoData = useFinanceStore((state) => state.injectDemoData)
  const clearRecipeMemory = useRecipeStore((state) => state.clearRecipeMemory)

  const activeLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'tr'

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
    if (globalThis.window) {
      globalThis.window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    }
  }

  const confirmAction = (translationKey) => {
    if (!globalThis.window || typeof globalThis.window.confirm !== 'function') {
      return true
    }
    return globalThis.window.confirm(t(translationKey))
  }

  const handleResetAllData = () => {
    if (!confirmAction('settings.resetDataConfirm')) {
      return
    }
    resetAllData()
  }

  const handleClearRecipeMemory = () => {
    if (!confirmAction('settings.clearRecipeMemoryConfirm')) {
      return
    }
    clearRecipeMemory()
    clearGeneratedRecipes()
    clearRecentRecipes()
    showToast(t('settings.clearRecipeMemorySuccess'))
  }

  const handleInjectDemoData = () => {
    if (!confirmAction('settings.demoDataConfirm')) {
      return
    }
    injectDemoData()
    showToast(t('settings.demoDataSuccess'))
  }

  // Bütçe profili açıklamaları
  const profileHints = {
    öğrenci: t('onboarding.profileHint.öğrenci'),
    aile: t('onboarding.profileHint.aile'),
    lüks: t('onboarding.profileHint.lüks'),
  }

  return (
    <section className="space-y-6 pb-24 md:pb-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4b4b4b]">
          {t('settings.badge')}
        </p>
        <h1 className="heading-display text-3xl font-bold text-[#050505]">
          {t('settings.title')}
        </h1>
      </header>

      {/* BÜTÇE PROFİLİ KARTI */}
      <article className="feature-card border border-black/10 bg-white p-6 shadow-soft transition-all duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#050505] border-b border-black/5 pb-3">
          <WalletCards className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#171717]">{t('settings.budgetProfile')}</span>
            <span className="text-xs font-medium text-[#737373] mt-0.5">
              Uygulama genelinde israf önleme ve bütçe planlama modunu kontrol eder
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {budgetProfiles.map((profile) => {
            const isActive = selectedBudgetProfile === profile.id
            return (
              <TapButton
                key={profile.id}
                type="button"
                onClick={() => updateBudgetProfile(profile.id)}
                className={[
                  'relative flex flex-col justify-between text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer w-full min-h-[110px]',
                  isActive
                    ? 'border-amber-500 bg-amber-50/50 shadow-soft ring-1 ring-amber-500/30'
                    : 'border-black/10 hover:border-black/25 bg-white hover:bg-slate-50/30',
                ].join(' ')}
              >
                <div className="flex items-start justify-between w-full">
                  <span className={`text-sm font-bold ${isActive ? 'text-amber-800' : 'text-[#171717]'}`}>
                    {t(getBudgetProfileLabelKey(profile.id))}
                  </span>
                  {isActive && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                      <Check className="h-3 w-3 stroke-[3px]" />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#4b4b4b] font-medium">
                  {profileHints[profile.id] || ''}
                </p>
              </TapButton>
            )
          })}
        </div>
      </article>

      {/* DİL SEÇİMİ KARTI */}
      <article className="feature-card border border-black/10 bg-white p-6 shadow-soft transition-all duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#050505] border-b border-black/5 pb-3">
          <Languages className="h-5 w-5 text-indigo-500" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#171717]">{t('settings.language')}</span>
            <span className="text-xs font-medium text-[#737373] mt-0.5">
              Sistem dilini Türkçe ve İngilizce olarak değiştirin
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-2xl bg-[#f7f4f0] p-1.5 max-w-sm">
          <TapButton
            type="button"
            onClick={() => handleLanguageChange('tr')}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-bold text-center transition-all duration-200',
              activeLanguage === 'tr'
                ? 'bg-[#171717] text-white shadow-md'
                : 'text-[#4b4b4b] hover:text-[#171717]',
            ].join(' ')}
          >
            Türkçe
          </TapButton>
          <TapButton
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-bold text-center transition-all duration-200',
              activeLanguage === 'en'
                ? 'bg-[#171717] text-white shadow-md'
                : 'text-[#4b4b4b] hover:text-[#171717]',
            ].join(' ')}
          >
            English
          </TapButton>
        </div>
      </article>

      {/* GELİŞTİRİCİ VE TEST SEÇENEKLERİ KARTI */}
      <article className="feature-card border border-black/10 bg-white p-6 shadow-soft transition-all duration-300">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-500" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#171717]">{t('settings.developerModeLabel')}</span>
              <span className="text-xs font-medium text-[#737373] mt-0.5">
                {t('settings.developerModeDescription')}
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={developerMode}
            aria-label={t('settings.developerModeLabel')}
            onClick={toggleDeveloperMode}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400',
              developerMode
                ? 'bg-teal-500 shadow-md shadow-teal-500/20'
                : 'bg-slate-200',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                developerMode ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Hızlı Erişim / Demo Test Aksiyonları */}
        <div className="mt-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <TapButton
              type="button"
              onClick={handleInjectDemoData}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-soft border border-slate-800"
            >
              <FlaskConical className="h-4 w-4 text-teal-400" aria-hidden="true" />
              {t('settings.loadDemoData')}
            </TapButton>

            <TapButton
              type="button"
              onClick={handleClearRecipeMemory}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 hover:border-black/25 bg-[#f7f4f0]/60 hover:bg-[#f7f4f0] px-4 py-3 text-sm font-semibold text-[#171717] transition"
            >
              <Trash2 className="h-4 w-4 text-rose-500" aria-hidden="true" />
              {t('settings.clearRecipeMemory')}
            </TapButton>
          </div>
          <p className="text-[11px] font-medium text-[#737373] text-center mt-1">
            * Demo Verisi Yükle butonu, mutfak stokunu kapsamlı 15 adet yerel malzeme ile doldurur ve cüzdan analizini hazır hale getirir.
          </p>
        </div>
      </article>

      {/* VERİ SIFIRLAMA KARTI */}
      <article className="feature-card border border-rose-100 bg-rose-50/20 p-6 shadow-soft transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 mt-0.5">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-rose-900">Tehlikeli Alan</span>
              <span className="text-xs font-medium text-rose-700/80 mt-0.5 leading-relaxed">
                Tüm mutfak stoklarınızı, yemek planlayıcı kayıtlarınızı ve finansal analiz geçmişinizi tamamen sıfırlayın. Bu işlem geri alınamaz.
              </span>
            </div>
          </div>

          <TapButton
            type="button"
            onClick={handleResetAllData}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-3 text-sm font-bold text-white transition shadow-lg shadow-rose-600/15 whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4 stroke-[2.5px]" aria-hidden="true" />
            {t('settings.resetData')}
          </TapButton>
        </div>
      </article>
    </section>
  )
}

export default SettingsPage
