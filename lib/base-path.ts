// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Next prefixes `basePath` onto <Link> hrefs and bundler-imported assets, but
// NOT onto raw string URLs into public/ (an <audio> src, a string next/image
// src with `images.unoptimized`). On GitHub Pages those resolve to the domain
// root and 404. The base path itself is defined once in next.config.ts and
// exposed as NEXT_PUBLIC_BASE_PATH ("" in dev, "/KangaFlow" in production).

/** A root-relative URL into public/, e.g. "/tracks/x.mp3". */
export type PublicPath = `/${string}`

/** Pure join, testable without the build-time env. */
export function joinBasePath(basePath: string, path: PublicPath): string {
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
  return `${base}${path}`
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** `path` as the browser must request it (base path applied). */
export function withBasePath(path: PublicPath): string {
  return joinBasePath(BASE_PATH, path)
}
