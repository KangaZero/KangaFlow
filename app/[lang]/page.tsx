import { notFound } from "next/navigation"
import { AboutSection } from "@/components/about-section"
import { SectionSidebar } from "@/components/section-sidebar"
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
      <aside className="fixed top-1/2 left-8 z-30 hidden -translate-y-1/2 lg:block">
        <SectionSidebar />
      </aside>
    </main>
  )
}
