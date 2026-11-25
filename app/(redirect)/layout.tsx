// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { ReactNode } from "react"

import { RootDocument } from "@/app/root-document"
import { DEFAULT_LOCALE } from "@/lib/i18n"

// Root layout for "/" alone: it renders nothing but a client redirect to a
// locale, which then loads under app/[lang]'s own root layout (a full page
// load, which is fine for a one-time bounce).
export default function RedirectLayout({ children }: { children: ReactNode }) {
  return <RootDocument lang={DEFAULT_LOCALE}>{children}</RootDocument>
}
