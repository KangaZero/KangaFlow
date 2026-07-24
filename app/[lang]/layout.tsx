import { notFound } from "next/navigation"

import { AchievementToast } from "@/components/achievement-toast"
import { CommandMenu } from "@/components/command-menu"
import { MediaPlayer } from "@/components/media-player"
import { SettingsDialog } from "@/components/settings-dialog"
import { ShortcutDispatcher } from "@/components/shortcut-dispatcher"
import { SiteHeader } from "@/components/site-header"
import { TerminalDialog } from "@/components/terminal-dialog"
import { ThemeBackground } from "@/components/theme-background"
import { isLocale, LOCALES } from "@/lib/i18n"
import { readSourceFiles } from "@/lib/terminal/source"
import { AchievementsProvider } from "@/providers/achievements-provider"
import { GlobalStatesProvider } from "@/providers/global-state-provider"
import { LocaleProvider } from "@/providers/locale-provider"

// Pre-render exactly /en and /ja; reject anything else (required for a static
// export — no server exists to resolve unknown params at request time).
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  // Read at build time (static export) → real repo source for the terminal's
  // nvim/cat/ls, shipped as strings. No runtime filesystem access.
  const sourceFiles = readSourceFiles()

  return (
    <LocaleProvider locale={lang}>
      <GlobalStatesProvider>
        <AchievementsProvider>
          <div className="relative min-h-screen pb-28 sm:pb-0">
            <ThemeBackground />
            <SiteHeader />
            {children}
            <CommandMenu />
            <SettingsDialog />
            <MediaPlayer />
            <TerminalDialog files={sourceFiles} />
            <ShortcutDispatcher />
            <AchievementToast />
          </div>
        </AchievementsProvider>
      </GlobalStatesProvider>
    </LocaleProvider>
  )
}
