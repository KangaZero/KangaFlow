"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/ui/esc-close.css"

import { useLocale } from "@/providers/locale-provider"

// Contents of an .esc-close button: the Esc key name (hidden on touch and on
// phone-width screens, see esc-close.css) and a decorative ✕. The button
// itself carries the accessible name through aria-label, so neither part is
// announced on its own.
export function EscCloseLabel() {
  const { translate } = useLocale()
  return (
    <>
      <span aria-hidden="true" className="esc-close__key">
        {translate("common.escKey")}
      </span>
      <span aria-hidden="true">✕</span>
    </>
  )
}
