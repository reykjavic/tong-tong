import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import deTranslations from './locales/de.json'
import enTranslations from './locales/en.json'

const translations = { de: deTranslations, en: enTranslations }

type Language = 'de' | 'en'

interface I18nContextType {
  language: Language
  t: (key: string) => string
  toggleLanguage: () => void
  setLanguage: (lang: Language) => void
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split('.')
  let result: any = obj
  for (const key of keys) {
    if (result == null) return path
    result = result[key]
  }
  return typeof result === 'string' ? result : path
}

function detectBrowserLanguage(): Language {
  const navLang = navigator.language || (navigator as any).languages?.[0] || 'en'
  if (navLang.startsWith('de')) return 'de'
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('tt-lang')
    if (stored === 'de' || stored === 'en') return stored
    return detectBrowserLanguage()
  })

  useEffect(() => {
    localStorage.setItem('tt-lang', language)
  }, [language])

  const t = (key: string): string => {
    return getNestedValue(translations[language], key) || key
  }

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'de' ? 'en' : 'de'))
  }

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  return (
    <I18nContext.Provider value={{ language, t, toggleLanguage, setLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}