"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { House, Languages, Settings, Trophy } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ComponentType, type ReactNode, useState } from "react"

import { HeaderDate } from "@/components/header-date"
import { HeaderStatus } from "@/components/header-status"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import type { AppPath } from "@/lib/globalStates"
import { formatShortcut, type ShortcutAction } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// Thin vertical divider between dock groups.
function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
}

// Circle-reveal pill hover, adapted from reactbits PillNav (rebuilt in pure CSS
// — no GSAP): on hover a circle grows from the pill's bottom to fill it while
// the icon rolls over — the resting icon slides up and out and an
// inverted-colour copy slides in from below. The parent Button must carry
// `group relative overflow-hidden` so the circle and the sliding icons are
// clipped to the pill.
// Hidden at rest (scale-0); on hover it scales to full from the pill's bottom
// edge (origin-bottom) so it reads as rising up to fill — only `transform`
// transitions, matching reactbits' ~0.3s ease-out.
const CIRCLE_REVEAL =
  "origin-bottom scale-0 transition-transform duration-300 ease-out group-hover:scale-100"

function PillHover({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[140%] -translate-x-1/2 rounded-full bg-primary",
          CIRCLE_REVEAL
        )}
      />
      {/* Two stacked copies in one grid cell: the resting icon rolls up and out
          while the inverted-colour copy rolls in from below. */}
      <span className="relative z-10 grid place-items-center">
        <span className="col-start-1 row-start-1 transition-transform duration-300 ease-out group-hover:translate-y-[-150%]">
          {children}
        </span>
        <span
          aria-hidden
          className="col-start-1 row-start-1 translate-y-[150%] text-primary-foreground transition-transform duration-300 ease-out group-hover:translate-y-0"
        >
          {children}
        </span>
      </span>
    </>
  )
}

// Theme-toggle variant of PillHover: same circle-reveal + roll animation, but the
// icon that rolls in on hover is the NEXT theme's icon (a preview of what a click
// will switch to), not an inverted copy of the current one.
function ThemePillHover({
  CurrentIcon,
  NextIcon,
}: {
  CurrentIcon: ComponentType
  NextIcon: ComponentType
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[140%] -translate-x-1/2 rounded-full bg-primary",
          CIRCLE_REVEAL
        )}
      />
      <span className="relative z-10 grid place-items-center">
        <span className="col-start-1 row-start-1 transition-transform duration-300 ease-out group-hover:translate-y-[-150%]">
          <CurrentIcon />
        </span>
        <span
          aria-hidden
          className="col-start-1 row-start-1 translate-y-[150%] text-primary-foreground transition-transform duration-300 ease-out group-hover:translate-y-0"
        >
          <NextIcon />
        </span>
      </span>
    </>
  )
}

export function SiteHeader() {
  const currentPath = usePathname() as AppPath
  const { locale, setLocale, translate } = useLocale()
  const { setIsSettingsOpen, shortcuts, isHelloEffectAnimationComplete } =
    useGlobalStates()
  // Clip the items only while the width sweep plays; drop it afterwards so the
  // (non-portaled, absolutely-positioned) tooltips aren't clipped by the dock.
  const [loaded, setLoaded] = useState(false)

  // Current key tokens for an action's tooltip <Kbd> chips (reflects live edits
  // from the Settings dialog); undefined when the action has no binding.
  const shortcutTokens = (action: ShortcutAction) => {
    const bound = shortcuts.find((shortcut) => shortcut.action === action)
    return bound ? formatShortcut(bound) : undefined
  }

  // Compare the path WITHOUT its locale segment: the language toggle swaps the
  // URL via history.replaceState (which usePathname doesn't observe), so a
  // locale-agnostic check keeps the active item correct after switching.
  const rest = currentPath
    .replace(/^\/(?:en|ja)(?=\/|$)/, "")
    .replace(/\/$/, "")
  const home = `/${locale}`
  const isHome = rest === ""
  const isAchievements = rest.startsWith("/achievements")
  const other = locale === "en" ? "ja" : "en"

  return (
    <header className="sticky top-0 z-40 flex items-center px-6 py-4">
      <HeaderDate />

      <HeaderStatus className="ml-auto hidden sm:block" />

      {/* Initial-load reveal (reactbits PillNav): the dock grows from zero
          width to full while overflow-hidden clips the items during the sweep. */}
      <motion.nav
        animate={{ width: "auto" }}
        className={cn(
          "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/80 p-1 shadow-lg backdrop-blur-sm sm:absolute sm:bottom-auto",
          !loaded && "overflow-hidden"
        )}
        initial={{ width: 0 }}
        onAnimationComplete={() => setLoaded(true)}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <AnimatedTooltip
          label={translate("nav.home")}
          shortcut={shortcutTokens("goHome")}
          side="responsive"
        >
          <Button
            aria-current={isHome ? "page" : undefined}
            aria-label={translate("nav.home")}
            asChild
            className="group relative overflow-hidden"
            size="icon"
            variant={isHome ? "secondary" : "ghost"}
          >
            <Link href={home}>
              <PillHover>
                <House />
              </PillHover>
            </Link>
          </Button>
        </AnimatedTooltip>

        <AnimatedTooltip
          label={translate("nav.achievements")}
          shortcut={shortcutTokens("goAchievements")}
          side="responsive"
        >
          <Button
            aria-current={isAchievements ? "page" : undefined}
            aria-label={translate("nav.achievements")}
            asChild
            className="group relative overflow-hidden"
            size="icon"
            variant={isAchievements ? "secondary" : "ghost"}
          >
            <Link href={`${home}/achievements`}>
              <PillHover>
                <Trophy />
              </PillHover>
            </Link>
          </Button>
        </AnimatedTooltip>

        <Divider />

        <AnimatedTooltip
          label={translate("nav.language")}
          shortcut={shortcutTokens("toggleLanguage")}
          side="responsive"
        >
          <Button
            aria-label={translate("nav.language")}
            className="group relative overflow-hidden"
            disabled={
              !isHelloEffectAnimationComplete &&
              (currentPath === "/en/" || currentPath === "/ja/")
            }
            onClick={() => setLocale(other)}
            size="icon"
            variant="ghost"
          >
            <PillHover>
              <Languages />
            </PillHover>
            <span className="sr-only">{other}</span>
          </Button>
        </AnimatedTooltip>

        <AnimatedTooltip
          label={translate("theme.label")}
          shortcut={shortcutTokens("cycleTheme")}
          side="responsive"
        >
          <ThemeToggle>
            {({ CurrentIcon, NextIcon }) => (
              <ThemePillHover CurrentIcon={CurrentIcon} NextIcon={NextIcon} />
            )}
          </ThemeToggle>
        </AnimatedTooltip>

        <AnimatedTooltip
          label={translate("nav.settings")}
          shortcut={shortcutTokens("toggleSettings")}
          side="responsive"
        >
          <Button
            aria-label={translate("nav.settings")}
            className="group relative overflow-hidden"
            onClick={() => setIsSettingsOpen(true)}
            size="icon"
            variant="ghost"
          >
            <PillHover>
              <Settings />
            </PillHover>
          </Button>
        </AnimatedTooltip>
      </motion.nav>
    </header>
  )
}
