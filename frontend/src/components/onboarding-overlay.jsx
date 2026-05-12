import { Gem, GraduationCap, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getBudgetProfileLabelKey, usePantryStore } from '../store/pantry-store'

const profileCards = [
  {
    id: 'öğrenci',
    Icon: GraduationCap,
    accentClass: 'from-kapya-500/20 via-white/35 to-sage-200/25 dark:from-kapya-900/40 dark:to-sage-900/35',
  },
  {
    id: 'aile',
    Icon: Users,
    accentClass: 'from-sage-500/22 via-white/35 to-kapya-100/35 dark:from-sage-900/35 dark:to-kapya-900/35',
  },
  {
    id: 'lüks',
    Icon: Gem,
    accentClass: 'from-amber-300/30 via-white/40 to-kapya-200/25 dark:from-amber-700/35 dark:to-kapya-900/35',
  },
]

function OnboardingOverlay() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const completeOnboarding = usePantryStore((state) => state.completeOnboarding)

  const handleProfilePick = (profileId) => {
    completeOnboarding(profileId)
    navigate('/', { replace: true })
  }

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end bg-slate-night/25 px-4 pb-6 pt-10 sm:items-center sm:justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <motion.section
        className="glass-panel soft-card w-full max-w-xl overflow-hidden rounded-3xl border border-white/35"
        initial={{ y: 84, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 230, damping: 24 }}
      >
        <header className="bg-gradient-to-br from-kapya-500 to-kapya-700 px-5 pb-5 pt-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Kapya</p>
          <h1 className="heading-display mt-2 text-3xl font-semibold">{t('onboarding.title')}</h1>
          <p className="mt-2 text-sm text-white/90">{t('onboarding.subtitle')}</p>
        </header>

        <div className="space-y-3 px-4 py-5 sm:px-5">
          {profileCards.map(({ id, Icon, accentClass }, index) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => handleProfilePick(id)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.06, duration: 0.28 }}
              className={[
                'glass-panel w-full rounded-2xl border border-white/40 bg-gradient-to-br p-4 text-left shadow-soft',
                accentClass,
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/55 text-kapya-700 dark:bg-slate-800/65 dark:text-kapya-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-semibold text-sand-900 dark:text-slate-100">
                    {t(getBudgetProfileLabelKey(id))}
                  </p>
                  <p className="text-xs text-sand-700 dark:text-slate-300">
                    {t(`onboarding.profileHint.${id}`)}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}

export default OnboardingOverlay
