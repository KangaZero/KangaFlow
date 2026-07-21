"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { BlueSky } from "@/components/blue-sky"

// The WebGL backgrounds pull heavy deps (ogl / three + postprocessing), so they
// load only when their theme is active — a light-theme visitor never downloads
// them. BlueSky is pure CSS, so it ships inline.
const LightRays = dynamic(
  () => import("@/components/LightRays").then((m) => m.LightRays),
  { ssr: false }
)
const PixelBlast = dynamic(() => import("@/components/PixelBlast"), {
  ssr: false,
})

const FILL = "h-full w-full"

function activeBackground(theme: string | undefined) {
  switch (theme) {
    case "dark":
      return <LightRays className={FILL} />
    case "terminal":
      return <PixelBlast className={FILL} color="#a6e3a1" transparent />
    default:
      return <BlueSky className={FILL} />
  }
}

// Per-theme background layer. Renders nothing until mounted so the server HTML
// (which can't know the resolved theme) and first client render match, then the
// correct background fills in.
export function ThemeBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {mounted ? activeBackground(resolvedTheme) : null}
    </div>
  )
}
