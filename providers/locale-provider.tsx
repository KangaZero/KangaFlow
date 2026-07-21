"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import { type Locale, type Translate, t } from "@/lib/i18n"

const COOKIE = "NEXT_LOCALE"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  translate: Translate
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

function persistLocale(locale: Locale) {
  // biome-ignore lint/suspicious/noDocumentCookie: document.cookie is the cross-browser way to set a simple locale cookie; the CookieStore API lacks Firefox support.
  document.cookie = `${COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}

function LocaleProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  // Locale lives in state (seeded from the route param) so switching it
  // re-renders translations WITHOUT a route change or reload.
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale)

  // Real navigation / a direct load changes the route param → resync.
  React.useEffect(() => {
    setLocaleState(initialLocale)
  }, [initialLocale])

  // Persist the active locale and mirror it onto <html lang> for a11y/SEO.
  React.useEffect(() => {
    persistLocale(locale)
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    persistLocale(next)
    // Swap only the leading /<lang> segment in the address bar via the History
    // API — no router navigation, no reload. The state change above re-renders
    // the translated strings in place (matches the portfolio's LocaleToggle).
    const { pathname, search, hash } = window.location
    const swapped = pathname.replace(/(^|\/)(?:en|ja)(?=\/|$)/, `$1${next}`)
    window.history.replaceState(null, "", `${swapped}${search}${hash}`)
  }, [])

  // Locale-bound translate that keeps `t`'s precise per-key return type.
  const translate = React.useMemo<Translate>(
    () => (key) => t(key, locale),
    [locale]
  )

  const value = React.useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, translate }),
    [locale, setLocale, translate]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext)
  if (ctx == null) {
    throw new Error("useLocale must be used within a <LocaleProvider>")
  }
  return ctx
}

export { LocaleProvider, useLocale }
