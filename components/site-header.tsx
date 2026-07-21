"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { House, Languages, Settings, Trophy } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { HeaderDate } from "@/components/header-date"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/providers/locale-provider"

// Thin vertical divider between dock groups.
function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
}

export function SiteHeader() {
  const pathname = usePathname()
  const { locale, setLocale, translate } = useLocale()

  // trailingSlash is on, so normalise before comparing.
  const path = pathname.replace(/\/$/, "")
  const home = `/${locale}`
  const isHome = path === home
  const isAchievements = path.startsWith(`${home}/achievements`)
  const other = locale === "en" ? "ja" : "en"

  return (
    <header className="sticky top-0 z-40 flex items-center px-6 py-4">
      <HeaderDate />

      <nav className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/80 p-1 shadow-lg backdrop-blur-sm sm:absolute sm:bottom-auto">
        <AnimatedTooltip label={translate("nav.home")} side="responsive">
          <Button
            aria-current={isHome ? "page" : undefined}
            aria-label={translate("nav.home")}
            asChild
            size="icon"
            variant={isHome ? "secondary" : "ghost"}
          >
            <Link href={home}>
              <House />
            </Link>
          </Button>
        </AnimatedTooltip>

        <AnimatedTooltip
          label={translate("nav.achievements")}
          side="responsive"
        >
          <Button
            aria-current={isAchievements ? "page" : undefined}
            aria-label={translate("nav.achievements")}
            asChild
            size="icon"
            variant={isAchievements ? "secondary" : "ghost"}
          >
            <Link href={`${home}/achievements`}>
              <Trophy />
            </Link>
          </Button>
        </AnimatedTooltip>

        <Divider />

        <AnimatedTooltip label={translate("nav.language")} side="responsive">
          <Button
            aria-label={translate("nav.language")}
            onClick={() => setLocale(other)}
            size="icon"
            variant="ghost"
          >
            <Languages />
            <span className="sr-only">{other}</span>
          </Button>
        </AnimatedTooltip>

        <AnimatedTooltip label={translate("theme.label")} side="responsive">
          <ThemeToggle />
        </AnimatedTooltip>

        <AnimatedTooltip label={translate("nav.settings")} side="responsive">
          <Button
            aria-label={translate("nav.settings")}
            disabled
            size="icon"
            variant="ghost"
          >
            <Settings />
          </Button>
        </AnimatedTooltip>
      </nav>
    </header>
  )
}
