// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type { NextConfig } from "next"

// Project site lives at https://<user>.github.io/KangaFlow, so every route and
// asset must be served under that sub-path. Kept in one const so basePath and
// assetPrefix can never drift apart.
const basePath = process.env.NODE_ENV === "production" ? "/KangaFlow" : ""

const nextConfig: NextConfig = {
  assetPrefix: basePath,
  basePath,
  // TypeScript 7 (Go-native) ships only the `tsc` CLI, not the legacy
  // programmatic compiler API, so Next must invoke the CLI for its type check.
  experimental: { useTypeScriptCli: true },
  // Pages has no Next.js Image Optimization server; serve images as-is.
  images: { unoptimized: true },
  // Emit a fully static site into ./out — no Node server on GitHub Pages.
  output: "export",
  // Each route becomes a directory with index.html (foo/ -> foo/index.html),
  // which is how a static host resolves clean URLs without a rewrite server.
  trailingSlash: true,
}

export default nextConfig
