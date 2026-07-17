// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import en from "@/lib/i18n/en"
import ja from "@/lib/i18n/ja"

// Literal-string union (Workstream D). Kept explicit rather than derived from
// `translations` to break the circular dependency with the `satisfies` check.
export type Locale = "en" | "ja"

export const LOCALES: readonly Locale[] = ["en", "ja"]

export const DEFAULT_LOCALE: Locale = "en"

// Narrows an arbitrary string (route param, cookie, navigator.language) to a
// supported Locale.
export function isLocale(value: string | undefined): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value)
}

// English is the source of truth for keys; other locales must structurally
// match its shape (enforced by `satisfies` below).
export type Translation = typeof en

// Widen literal values to their base types so a locale is validated on
// structure (same keys, string values, same array-ness) without having to
// reproduce English's exact string literals.
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { [K in keyof T]: Widen<T[K]> }

export const translations = { en, ja } satisfies Record<
  Locale,
  Widen<Translation>
>

// Dotted key of every leaf. Arrays are treated as leaves (their whole value is
// consumed at once), which keeps array-prototype members out of the key union.
type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`

type NestedKeys<T> = (
  T extends readonly unknown[]
    ? ""
    : T extends object
      ? {
          [K in keyof T]: K extends string
            ? `${K}${DotPrefix<NestedKeys<T[K]>>}`
            : never
        }[keyof T]
      : ""
) extends infer D
  ? Extract<D, string>
  : never

export type TranslationKey = NestedKeys<Translation>

type NestedValue<T, K extends string> = K extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? NestedValue<T[First], Rest>
    : undefined
  : K extends keyof T
    ? T[K]
    : undefined

function get<T, K extends string>(obj: T, key: K): NestedValue<T, K> {
  const parts = key.split(".")
  let result: unknown = obj
  for (const part of parts) {
    if (result && typeof result === "object" && part in result) {
      result = (result as Record<string, unknown>)[part]
    } else {
      return undefined as NestedValue<T, K>
    }
  }
  return result as NestedValue<T, K>
}

/**
 * Type-safe translation lookup.
 *
 * Prefer the `translate` from `useLocale()` (components/locale-provider.tsx),
 * which injects the active locale automatically. Use this direct form only when
 * the locale must be explicit (e.g. server/static generation).
 *
 * Falls back to English, then to the raw key, so a missing translation degrades
 * gracefully instead of rendering `undefined`.
 */
// Locale-bound translate signature (what `useLocale().translate` exposes):
// same precise per-key inference as `t`, minus the locale argument.
export type Translate = <K extends TranslationKey>(
  key: K
) => NestedValue<Translation, K>

export function t<K extends TranslationKey>(
  key: K,
  locale: Locale = "en"
): NestedValue<Translation, K> {
  return (get(translations[locale], key) ??
    get(translations.en, key) ??
    key) as NestedValue<Translation, K>
}
