// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { notFound } from "next/navigation"

import { AboutSection } from "@/components/about-section"
import { SiteFooter } from "@/components/site-footer"
import { isLocale } from "@/lib/i18n"

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
      <AboutSection />
      <SiteFooter />
    </main>
  )
}
