"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import type { CSSProperties } from "react"
import "./blue-sky.css"

// Light-theme background: a self-authored CSS blue sky — warm sun, drifting
// parallax clouds, and flapping birds. Chosen over registry backgrounds because
// none offer a true sky and they carry a Commons-Clause licence; this is
// dependency-free and licence-clean. Palette is complementary (cool blue sky vs
// warm amber sun) with white clouds and slate birds as neutrals. Decorative
// only (aria-hidden); the parent controls positioning.

// Each bird gets its own lane, timing, and size via CSS custom properties.
const BIRDS = [
  { delay: "0s", duration: "19s", scale: 1, top: "16%" },
  { delay: "5s", duration: "24s", scale: 0.7, top: "27%" },
  { delay: "11s", duration: "28s", scale: 0.85, top: "11%" },
  { delay: "3s", duration: "21s", scale: 0.6, top: "33%" },
] as const

export function BlueSky({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`blue-sky ${className ?? ""}`}>
      <div className="blue-sky-sun" />
      <div className="blue-sky-clouds blue-sky-clouds-back" />
      <div className="blue-sky-clouds blue-sky-clouds-front" />
      <div className="blue-sky-birds">
        {BIRDS.map((bird) => (
          <svg
            className="blue-sky-bird"
            key={`${bird.top}-${bird.delay}`}
            style={
              {
                "--bird-scale": bird.scale,
                animationDelay: bird.delay,
                animationDuration: bird.duration,
                top: bird.top,
              } as CSSProperties
            }
            viewBox="0 0 24 10"
          >
            <title>bird</title>
            <path
              className="blue-sky-bird-wing"
              d="M1 7 Q6 1 12 6 Q18 1 23 7"
            />
          </svg>
        ))}
      </div>
    </div>
  )
}
