// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { type RefObject, useEffect } from "react"

import {
  aimCardSpring,
  createCardSpring,
  isSettled,
  stepCardSpring,
} from "@/lib/card-spring"

const TILT_DEG = 14
const PARALLAX_PX = 10

/**
 * Drive a trading card's tilt, holo position and light from the pointer via
 * the spring in lib/card-spring. Writes CSS custom properties on the element
 * (--rx, --ry, --mx, --my, --sx, --sy, --light) and runs a rAF loop only while
 * the spring is moving. `enabled: false` (reduced motion, dragging) parks it.
 * `tiltDeg` is the tilt at the card's edge (default 14°).
 */
export function useCardSpring(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  { tiltDeg = TILT_DEG }: { tiltDeg?: number } = {}
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let spring = createCardSpring()
    let frame = 0
    let last = 0

    const write = () => {
      const { x, y, light } = spring
      const style = element.style
      style.setProperty("--rx", `${(-y.position * tiltDeg).toFixed(3)}deg`)
      style.setProperty("--ry", `${(x.position * tiltDeg).toFixed(3)}deg`)
      style.setProperty("--mx", `${((x.position + 1) * 50).toFixed(2)}%`)
      style.setProperty("--my", `${((y.position + 1) * 50).toFixed(2)}%`)
      style.setProperty("--sx", `${(x.position * PARALLAX_PX).toFixed(2)}px`)
      style.setProperty("--sy", `${(y.position * PARALLAX_PX).toFixed(2)}px`)
      style.setProperty("--light", light.toFixed(3))
    }
    const tick = (now: number) => {
      spring = stepCardSpring(spring, (now - last) / 1000)
      last = now
      write()
      frame = isSettled(spring) ? 0 : requestAnimationFrame(tick)
    }
    const wake = () => {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    const aim = (nx: number, ny: number, active: boolean) => {
      spring = aimCardSpring(spring, nx, ny, active)
      wake()
    }
    const onMove = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return
      const rect = element.getBoundingClientRect()
      aim(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
        true
      )
    }
    const onLeave = () => aim(0, 0, false)
    const onFocus = () => aim(0, -0.3, true)

    if (!enabled) {
      onLeave()
      return () => cancelAnimationFrame(frame)
    }
    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerleave", onLeave)
    element.addEventListener("focusin", onFocus)
    element.addEventListener("focusout", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerleave", onLeave)
      element.removeEventListener("focusin", onFocus)
      element.removeEventListener("focusout", onLeave)
    }
  }, [ref, enabled, tiltDeg])
}
