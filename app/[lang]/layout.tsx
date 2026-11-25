import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RootDocument } from "@/app/root-document"
import { AchievementToast } from "@/components/achievement-toast"
import { HintOverlay } from "@/components/hint-overlay"
import { Neko } from "@/components/neko"
import { SettingsDialog } from "@/components/settings-dialog"
import { SfxSync } from "@/components/sfx-sync"
import { ShortcutDispatcher } from "@/components/shortcut-dispatcher"
import { SiteHeader } from "@/components/site-header"
import { TerminalDialog } from "@/components/terminal-dialog"
import { ThemeBackground } from "@/components/theme-background"
import { WebMcp } from "@/components/webmcp"
import { WidgetManagement } from "@/components/widgets/widget-management"
import { isLocale, LOCALES } from "@/lib/i18n"
import { siteMetadata } from "@/lib/metadata"
import { AchievementsProvider } from "@/providers/achievements-provider"
import { GlobalStatesProvider } from "@/providers/global-state-provider"
import { LocaleProvider } from "@/providers/locale-provider"
import { NotificationsProvider } from "@/providers/notifications-provider"
import { ZOrderProvider } from "@/providers/z-order-provider"

// Pre-render exactly /en and /ja; reject anything else (required for a static
// export — no server exists to resolve unknown params at request time).
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  return siteMetadata(params)
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params
  if (!isLocale(lang)) {
    notFound()
  }

  return (
    <RootDocument lang={lang}>
      <LocaleProvider locale={lang}>
        <GlobalStatesProvider>
          <ZOrderProvider>
            <NotificationsProvider>
              <AchievementsProvider>
                <div className="relative min-h-screen pb-28 sm:pb-0">
                  <ThemeBackground />
                  <SiteHeader />
                  {children}
                  <SettingsDialog />
                  <TerminalDialog />
                  <ShortcutDispatcher />
                  <WebMcp />
                  <HintOverlay />
                  <WidgetManagement />
                  <AchievementToast />
                  <SfxSync />
                  {/* Global: the settings-title N (and the terminal's `oneko`)
                    summon the cat on every page, not just the environment. */}
                  <Neko />
                </div>
              </AchievementsProvider>
            </NotificationsProvider>
          </ZOrderProvider>
        </GlobalStatesProvider>
      </LocaleProvider>
    </RootDocument>
  )
}
