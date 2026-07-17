"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useRouter } from "next/navigation"
import * as React from "react"

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n"

// The static root has no server to negotiate locale, so redirect on the client:
// cookie preference → browser language → default. Everything real lives under
// /[lang]; this page only bounces the visitor there.
export default function RootRedirect() {
  const router = useRouter()

  React.useEffect(() => {
    const cookie = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.at(1)
    const navigator = window.navigator.language.slice(0, 2)
    const target = isLocale(cookie)
      ? cookie
      : isLocale(navigator)
        ? navigator
        : DEFAULT_LOCALE
    router.replace(`/${target}`)
  }, [router])

  return null
}
