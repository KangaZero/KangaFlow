// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { notFound } from "next/navigation"

import { PageCodeButton } from "@/components/page-code-button"
import { TimelineView } from "@/components/timeline-view"
import { isLocale } from "@/lib/i18n"

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  return (
    <>
      <TimelineView />
      <PageCodeButton file="app/[lang]/timeline/page.tsx" />
    </>
  )
}
