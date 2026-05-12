import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tr from '../locales/tr.json'
import en from '../locales/en.json'

const LANGUAGE_STORAGE_KEY = 'kapya-language'

const getSavedLanguage = () => {
  if (globalThis.window === undefined) {
    return 'tr'
  }

  const savedLanguage = globalThis.window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return savedLanguage === 'en' ? 'en' : 'tr'
}

i18n.use(initReactI18next).init({
  resources: {
    tr: {
      translation: tr,
    },
    en: {
      translation: en,
    },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'tr',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export default i18n