// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EnvironmentView } from "@/components/niri/environment-view"
import { isLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"

export function generateMetadata({
  params,
}: PageProps<"/[lang]/environment">): Promise<Metadata> {
  return pageMetadata(params, "environment")
}

export default async function EnvironmentPage({
  params,
}: PageProps<"/[lang]/environment">) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  return <EnvironmentView />
}
