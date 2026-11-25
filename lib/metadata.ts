// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { Metadata } from "next"

import { DEFAULT_LOCALE, isLocale, type Locale, t } from "@/lib/i18n"
import type { PageName } from "@/lib/pages"

/** The route's locale, or the default for an unknown segment (it 404s anyway). */
async function routeLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params
  return isLocale(lang) ? lang : DEFAULT_LOCALE
}

/**
 * Site-wide metadata for app/[lang]/layout: "<page> · KangaFlow" title
 * template, the brand alone on the home page, and a localized description.
 */
export async function siteMetadata(
  params: Promise<{ lang: string }>
): Promise<Metadata> {
  const locale = await routeLocale(params)
  const siteName = t("meta.siteName", locale)
  return {
    description: t("meta.description", locale),
    title: { default: siteName, template: `%s · ${siteName}` },
  }
}

/** A page's localized title (filled into the layout's template). */
export async function pageMetadata(
  params: Promise<{ lang: string }>,
  page: Exclude<PageName, "home">
): Promise<Metadata> {
  const locale = await routeLocale(params)
  return { title: t(`nav.${page}`, locale) }
}
