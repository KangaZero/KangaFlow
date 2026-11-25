// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { Metadata } from "next"
import Link from "next/link"

import { RootDocument } from "@/app/root-document"
import { DEFAULT_LOCALE, t } from "@/lib/i18n"

// 404.html for every unmatched URL. It bypasses the app's layouts, so it brings
// its own document (fonts, global styles, theme) via RootDocument. A static
// host serves it with no locale context, so it is in the default locale.
export const metadata: Metadata = {
  title: `${t("common.notFound.heading", DEFAULT_LOCALE)} · ${t("meta.siteName", DEFAULT_LOCALE)}`,
}

export default function GlobalNotFound() {
  return (
    <RootDocument lang={DEFAULT_LOCALE}>
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">
          {t("common.notFound.heading", DEFAULT_LOCALE)}
        </h1>
        <p className="text-muted-foreground">
          {t("common.notFound.text", DEFAULT_LOCALE)}
        </p>
        <Link
          className="underline underline-offset-4"
          href={`/${DEFAULT_LOCALE}`}
        >
          {t("common.notFound.link", DEFAULT_LOCALE)}
        </Link>
      </main>
    </RootDocument>
  )
}
