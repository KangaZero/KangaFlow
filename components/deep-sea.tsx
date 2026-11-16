"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/deep-sea.css"

import { Fragment, useEffect, useRef, useState } from "react"

import { type CssBubble, makeCssBubbles } from "@/lib/deep-sea/css-bubbles"
import { buildDeepSea, DEEP_SEA_LAYERS, runDeepSea } from "@/lib/deep-sea/scene"
import { cn } from "@/lib/utils"

function Bubble({ bubble }: { bubble: CssBubble }) {
  return (
    <span
      className="sea-bubble"
      data-big={bubble.big}
      data-depth={bubble.depth}
      style={{
        "--amplitude": `${bubble.amplitude.toFixed(1)}px`,
        "--delay": `${bubble.delay.toFixed(2)}s`,
        "--duration": `${bubble.duration.toFixed(2)}s`,
        "--size": `${bubble.size.toFixed(1)}px`,
        "--sway": `${bubble.sway.toFixed(2)}s`,
        "--wobble": `${bubble.wobble.toFixed(2)}s`,
        "--x": `${bubble.x.toFixed(2)}%`,
      }}
    >
      <span className="sea-bubble__sway">
        <span className="sea-bubble__body" />
      </span>
    </span>
  )
}

/**
 * Dark-theme deep sea: canvas depth layers (creatures, simulated in
 * lib/deep-sea) interleaved with CSS bubble tiers. Mounted only after
 * hydration by ThemeBackground, so the random layout never mismatches SSR.
 */
export function DeepSea({ className }: { className?: string }) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [bubbles] = useState(makeCssBubbles)

  useEffect(() => {
    const canvases = canvasRefs.current.filter(
      (canvas): canvas is HTMLCanvasElement => canvas !== null
    )
    const coarse = window.matchMedia("(pointer: coarse)").matches
    return runDeepSea(canvases, buildDeepSea(coarse))
  }, [])

  return (
    <div
      aria-hidden
      className={cn(
        "deep-sea pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      style={{ containerType: "size" }}
    >
      {DEEP_SEA_LAYERS.map((layer, index) => (
        <Fragment key={layer.id}>
          {"bubblesBefore" in layer
            ? bubbles
                .filter((bubble) => bubble.depth === layer.bubblesBefore)
                .map((bubble) => <Bubble bubble={bubble} key={bubble.id} />)
            : null}
          <canvas
            className="absolute inset-0 size-full"
            ref={(canvas) => {
              canvasRefs.current[index] = canvas
            }}
            style={{
              filter: layer.blur > 0 ? `blur(${layer.blur}px)` : undefined,
              opacity: layer.opacity,
            }}
          />
        </Fragment>
      ))}
    </div>
  )
}
