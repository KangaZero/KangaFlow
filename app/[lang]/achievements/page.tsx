// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AchievementsView } from "@/components/achievements-view"
import { PageCodeButton } from "@/components/page-code-button"
import { isLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"

export function generateMetadata({
  params,
}: PageProps<"/[lang]/achievements">): Promise<Metadata> {
  return pageMetadata(params, "achievements")
}

export default async function AchievementsPage({
  params,
}: PageProps<"/[lang]/achievements">) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  return (
    <>
      <AchievementsView />
      <PageCodeButton file="app/[lang]/achievements/page.tsx" />
    </>
  )
}
