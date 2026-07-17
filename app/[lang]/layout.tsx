import { notFound } from "next/navigation"

import { AchievementToast } from "@/components/achievement-toast"
import { CommandMenu } from "@/components/command-menu"
import { isLocale, LOCALES } from "@/lib/i18n"
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

  return (
    <LocaleProvider locale={lang}>
      <GlobalStatesProvider>
        <AchievementsProvider>
          {children}
          <CommandMenu />
          <AchievementToast />
        </AchievementsProvider>
      </GlobalStatesProvider>
    </LocaleProvider>
  )
}
