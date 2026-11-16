"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { ExternalLink } from "lucide-react"
import { FaGithub } from "react-icons/fa6"

import type { Portfolio } from "@/components/timeline-portfolios"
import { useLocale } from "@/providers/locale-provider"

const LINK =
  "border-border hover:border-tooltip-shadow focus-visible:border-tooltip-shadow inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-[border-color,translate] hover:-translate-y-px"

/** "Visit site" + "View source" for one portfolio. */
export function TimelineLinks({ portfolio }: { portfolio: Portfolio }) {
  const { translate } = useLocale()
  return (
    <div className="flex flex-wrap gap-2">
      <a
        className={LINK}
        href={portfolio.liveUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink aria-hidden className="size-3.5" />
        {translate("timeline.visitSite")}
      </a>
      <a
        className={LINK}
        href={portfolio.repoUrl}
        rel="noreferrer"
        target="_blank"
      >
        <FaGithub aria-hidden className="size-3.5" />
        {translate("timeline.viewSource")}
      </a>
    </div>
  )
}
