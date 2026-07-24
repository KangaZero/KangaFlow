// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Hardcoded snapshot of selected repo source, baked in for the in-browser
// terminal (nvim/cat/ls). No build-time or runtime filesystem access.
// Regenerate from the real files when they change.

export const SOURCE_FILES: Record<string, string> = {
  "app/[lang]/achievements/page.tsx":
    '// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.\nimport { notFound } from "next/navigation"\n\nimport { AchievementsView } from "@/components/achievements-view"\nimport { PageCodeButton } from "@/components/page-code-button"\nimport { isLocale } from "@/lib/i18n"\n\nexport default async function AchievementsPage({\n  params,\n}: {\n  params: Promise<{ lang: string }>\n}) {\n  const { lang } = await params\n  if (!isLocale(lang)) {\n    notFound()\n  }\n\n  return (\n    <>\n      <AchievementsView />\n      <PageCodeButton file="components/achievements-view.tsx" />\n    </>\n  )\n}\n',
  "app/[lang]/page.tsx":
    'import { notFound } from "next/navigation"\nimport { AboutSection } from "@/components/about-section"\nimport { PageCodeButton } from "@/components/page-code-button"\nimport { SectionSidebar } from "@/components/section-sidebar"\nimport { SiteFooter } from "@/components/site-footer"\nimport { isLocale } from "@/lib/i18n"\n\n// Server component: rendered once per locale at build time, so translations are\n// resolved with the explicit route locale (no client hook needed here).\nexport default async function Home({\n  params,\n}: {\n  params: Promise<{ lang: string }>\n}) {\n  const { lang } = await params\n  if (!isLocale(lang)) {\n    notFound()\n  }\n\n  return (\n    <main className="flex min-h-svh flex-col p-6">\n      <AboutSection />\n      <SiteFooter />\n      <aside className="fixed top-1/2 left-8 z-30 hidden -translate-y-1/2 lg:block">\n        <SectionSidebar />\n      </aside>\n      <PageCodeButton file="components/about-section.tsx" />\n    </main>\n  )\n}\n',
  "app/[lang]/timeline/page.tsx":
    '// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.\nimport { notFound } from "next/navigation"\n\nimport { PageCodeButton } from "@/components/page-code-button"\nimport { TimelineView } from "@/components/timeline-view"\nimport { isLocale } from "@/lib/i18n"\n\nexport default async function TimelinePage({\n  params,\n}: {\n  params: Promise<{ lang: string }>\n}) {\n  const { lang } = await params\n  if (!isLocale(lang)) {\n    notFound()\n  }\n\n  return (\n    <>\n      <TimelineView />\n      <PageCodeButton file="components/timeline-view.tsx" />\n    </>\n  )\n}\n',
}

export function readSourceFiles(): Record<string, string> {
  return SOURCE_FILES
}
