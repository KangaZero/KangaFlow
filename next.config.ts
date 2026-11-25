// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { NextConfig } from "next"

// Project site lives at https://<user>.github.io/KangaFlow, so every route and
// asset must be served under that sub-path. The value is defined once, in
// .env.production (NEXT_PUBLIC_BASE_PATH, empty in dev): Next reads it here for
// basePath (which also prefixes /_next assets, so no assetPrefix), and inlines
// it into client code, where lib/base-path prefixes raw public/ URLs (audio
// src, string next/image src) that Next does not rewrite.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig: NextConfig = {
  basePath,
  // TypeScript 7 (Go-native) ships only the `tsc` CLI, not the JS compiler
  // API. `next build` defaults to the CLI on 16.4, but `next dev` still loads
  // the compiler API and throws "TypeScript 7.0.2 does not provide the compiler
  // API" unless this is set explicitly.
  experimental: {
    // The root layout sits under app/[lang] (so each locale prerenders its own
    // <html lang>), which leaves no single layout to compose the 404 from;
    // app/global-not-found.tsx renders 404.html instead. Documented for this
    // exact case (docs: file-conventions/not-found, "global-not-found.js").
    globalNotFound: true,
    useTypeScriptCli: true,
  },
  // Pages has no Next.js Image Optimization server; serve images as-is.
  images: { unoptimized: true },
  // Emit a fully static site into ./out — no Node server on GitHub Pages.
  output: "export",
  // Each route becomes a directory with index.html (foo/ -> foo/index.html),
  // which is how a static host resolves clean URLs without a rewrite server.
  trailingSlash: true,
}

export default nextConfig
