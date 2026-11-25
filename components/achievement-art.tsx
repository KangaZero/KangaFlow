// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// One original icon per achievement (48×48 grid, 2.4 round stroke in
// currentColor, .18 tint fills). The `.m` group is the part that moves while
// the card is hovered (achievement-collection.css). `satisfies Record<…>`
// means a new achievement without art fails the typecheck.

import type { ReactElement } from "react"

import type { AchievementId } from "@/lib/achievements"
import { cn } from "@/lib/utils"

const TINT = { fill: "currentColor", fillOpacity: 0.18 } as const
const SOLID = { fill: "currentColor", stroke: "none" } as const

/** Four-point sparkle centred on (x, y) with radius r. */
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  // Two decimals is plenty on a 48 grid and keeps float noise out of the DOM.
  const f = (value: number) => Number(value.toFixed(2))
  const k = f(r * 0.3)
  const l = f(r - k)
  return (
    <path
      {...SOLID}
      d={`M${x} ${f(y - r)}l${k} ${l} ${l} ${k}-${l} ${k}-${k} ${l}-${k}-${l}-${l}-${k} ${l}-${k}z`}
    />
  )
}

const ART = {
  // A cursor moving on its own: the sparkles are the agent.
  "bleeding-edge": (
    <>
      <path d="M6 40l8-8" strokeDasharray="2 3" />
      <path {...TINT} d="M10 6l24 10-10 3.6L19.6 30z" />
      <g className="m">
        <Sparkle r={7.7} x={36} y={30.7} />
      </g>
      <Sparkle r={3.4} x={26} y={40.4} />
    </>
  ),
  // Eos is the dawn: half sun (rays), half night (stars).
  eos: (
    <>
      <g className="m">
        <path d="M24 4v5M9.9 9.9l3.5 3.5M4 24h5M9.9 38.1l3.5-3.5M24 39v5" />
      </g>
      <circle cx={24} cy={24} r={9} />
      <path {...SOLID} d="M24 15a9 9 0 0 0 0 18z" fillOpacity={0.85} />
      <Sparkle r={2.9} x={38} y={12.4} />
      <circle {...SOLID} cx={40.5} cy={27} r={1.2} />
      <circle {...SOLID} cx={35} cy={37} r={1} />
    </>
  ),
  // Sun over a lawn.
  "go-touch-grass": (
    <>
      <circle {...TINT} cx={35} cy={12} r={5} />
      <path d="M35 3v2M44 12h-2M41.4 5.6 40 7M28.6 5.6 30 7" />
      <path d="M4 42h40" />
      <g className="m">
        <path d="M7 42c1-8 3.5-12.5 7.5-16-1 6-.5 10.5 1.5 16M17 42c0-10 3-17 9-22-3 8-3.2 15-1 22M28 42c1-6 3.5-10 7.5-12-2 4-2.2 8-1 12M36 42c1-4.5 3-7.5 6.5-9.5-1.8 3-2 6.5-1 9.5" />
      </g>
    </>
  ),
  // A door left ajar, light and a sparkle in the gap.
  "new-beginnings": (
    <>
      <path d="M6 42h36" />
      <path d="M12 42V8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v34" />
      <path
        d="M26 42h10V8l-10 2z"
        fill="currentColor"
        fillOpacity={0.1}
        stroke="none"
      />
      <g className="m">
        <path {...TINT} d="M14 7l12 3v32l-12-1z" />
        <circle {...SOLID} cx={23} cy={26} r={1.3} />
      </g>
      <Sparkle r={4.3} x={31} y={21.3} />
    </>
  ),
  // An arrow walking out of a dashed boundary through its open side.
  "out-of-bounds": (
    <>
      <path
        d="M30 7H10a3 3 0 0 0-3 3v28a3 3 0 0 0 3 3h20"
        strokeDasharray="3 4"
      />
      <path d="M14 30l2-2M18 33l2-2" opacity={0.6} />
      <g className="m">
        <path d="M16 24h26M35 17l7 7-7 7" />
      </g>
      <path d="M38 6l5 5M38 37l5 5" opacity={0.6} />
    </>
  ),
  // A cat (original, not oneko's sprite) shooed off the card by a cursor.
  psychopath: (
    <>
      <g className="m">
        <path
          {...TINT}
          d="M9 23V10l7 5.5h12L35 10v13c0 8.5-5.7 14-13 14S9 31.5 9 23z"
        />
        <path d="M15 22l3 2-3 2M29 22l-3 2 3 2M20 29.5q2 1.6 4 0" />
        <path d="M3 25h5M3 29.5l5-1" />
      </g>
      <path d="M40 18h5M41 23h4M40 28h5" opacity={0.6} />
      <path {...SOLID} d="M33 34l10 3.6-4 1.4-1.4 4z" />
    </>
  ),
  // A jigsaw piece clicking in.
  "puzzle-master": (
    <>
      <g className="m">
        <path
          {...TINT}
          d="M10 16h8a4 4 0 1 1 8 0h8v8a4 4 0 1 1 0 8v8h-8a4 4 0 1 0-8 0h-8v-8a4 4 0 1 0 0-8z"
        />
      </g>
      <Sparkle r={4.8} x={40} y={8.8} />
      <circle {...SOLID} cx={43} cy={18} r={1.2} />
    </>
  ),
  // A mandala whose grains blow away to the right.
  "sand-mandala": (
    <>
      <circle {...SOLID} cx={21} cy={24} r={3} />
      <circle {...TINT} cx={21} cy={24} r={9} />
      <circle cx={21} cy={24} r={15} strokeDasharray="1 3.6" />
      <path d="M21 9v6M21 33v6M6 24h6M30 24h6M10.4 13.4l4.2 4.2M27.4 30.4l4.2 4.2M10.4 34.6l4.2-4.2" />
      <g className="m">
        <circle {...SOLID} cx={36} cy={13} r={1.4} />
        <circle {...SOLID} cx={40} cy={18} r={1.2} />
        <circle {...SOLID} cx={43} cy={12} r={1} />
        <circle {...SOLID} cx={44} cy={22} r={0.9} />
      </g>
    </>
  ),
  // A magnifier with a "?" over an office block.
  "snoopy-detective": (
    <>
      <path d="M4 40h24" />
      <rect height={28} rx={1} width={14} x={7} y={12} />
      <path d="M11 17h2M15 17h2M11 22h2M15 22h2M11 27h2M15 27h2M12 40v-6h4v6" />
      <g className="m">
        <circle cx={30} cy={21} fill="currentColor" fillOpacity={0.14} r={9} />
        <path d="M36.5 27.5 44 35" />
        <path d="M27.6 18.6a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.2.9-1.2 1.6v.6M30 26.2v.1" />
      </g>
    </>
  ),
  // Binoculars under a little network of linked profiles.
  "social-stalker": (
    <>
      <g className="m">
        <circle {...TINT} cx={14} cy={31} r={8} />
        <circle {...TINT} cx={34} cy={31} r={8} />
        <path d="M7.5 26 12 15h5l2 9M40.5 26 36 15h-5l-2 9M19 30h10" />
        <path d="M10 29a4 4 0 0 1 4-4M30 29a4 4 0 0 1 4-4" />
      </g>
      <path d="M16 6h16" strokeDasharray="2 3" />
      <circle {...SOLID} cx={16} cy={6} r={2} />
      <circle {...SOLID} cx={24} cy={6} r={2} />
      <circle {...SOLID} cx={32} cy={6} r={2} />
    </>
  ),
  // A stopwatch whose hand is a lightning bolt.
  speedophile: (
    <>
      <circle {...TINT} cx={24} cy={27} r={15} />
      <path d="M20 5h8M24 5v7M37.5 13.5 40.5 10.5" />
      <path d="M24 14v2M37 27h-2M24 40v-2M11 27h2" opacity={0.6} />
      <g className="m">
        <path
          {...SOLID}
          d="M26.5 17 19 28.5h6l-2 9.5 8.5-12.5h-6z"
          fillOpacity={0.9}
        />
      </g>
    </>
  ),
} as const satisfies Record<AchievementId, ReactElement>

export function AchievementArt({
  id,
  className,
}: {
  id: AchievementId
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("ach-art", className)}
      data-art={id}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.4}
      viewBox="0 0 48 48"
    >
      {ART[id]}
    </svg>
  )
}
