"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { usePathname, useRouter } from "next/navigation"
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
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Persist the active locale and mirror it onto <html lang> for a11y/SEO.
  React.useEffect(() => {
    persistLocale(locale)
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = React.useCallback(
    (next: Locale) => {
      persistLocale(next)
      // Swap the leading /<lang> segment and navigate client-side.
      const rest = pathname.replace(/^\/(?:en|ja)(?=\/|$)/, "")
      router.push(`/${next}${rest}`)
    },
    [pathname, router]
  )

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
