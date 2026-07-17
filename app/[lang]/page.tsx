// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { notFound } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"
import { isLocale, t } from "@/lib/i18n"

// Server component: rendered once per locale at build time, so translations are
// resolved with the explicit route locale (no client hook needed here).
export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  return (
    <main className="flex min-h-svh flex-col p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-medium text-lg">KangaFlow</h1>
        <ThemeToggle />
      </header>

      <p className="mt-4 text-muted-foreground text-sm">
        {t("home.tagline", lang)}
      </p>

      <footer className="mt-auto flex flex-col gap-1 font-mono text-muted-foreground text-xs">
        <span>{t("home.themeHint", lang)}</span>
        <span>{t("home.commandHint", lang)}</span>
      </footer>
    </main>
  )
}
