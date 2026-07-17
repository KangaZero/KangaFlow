// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { notFound } from "next/navigation"

import { AchievementsView } from "@/components/achievements-view"
import { isLocale } from "@/lib/i18n"

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  return <AchievementsView />
}
