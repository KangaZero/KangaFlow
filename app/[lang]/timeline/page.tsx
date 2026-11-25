// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PageCodeButton } from "@/components/page-code-button"
import { TimelineView } from "@/components/timeline-view"
import { isLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"

export function generateMetadata({
  params,
}: PageProps<"/[lang]/timeline">): Promise<Metadata> {
  return pageMetadata(params, "timeline")
}

export default async function TimelinePage({
  params,
}: PageProps<"/[lang]/timeline">) {
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
