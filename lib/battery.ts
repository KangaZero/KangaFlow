"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Battery status from the (Chromium-only) Battery Status API, plus pure helpers
// for the bar's faux system monitor. TS's DOM lib dropped `navigator.getBattery`,
// so we type the slice we read rather than reaching for `any`.

import { useEffect, useState } from "react"

export type BatteryState = {
  supported: boolean
  level: number | null // 0..1, or null when unknown/unsupported
  charging: boolean
}

type BatteryManager = EventTarget & { level: number; charging: boolean }
type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManager>
}

// 0..1 → whole percent, or null when we have no reading.
export function getBatteryPercentage(level: number | null): number | null {
  return level === null ? null : Math.round(level * 100)
}

export function isCharging(state: BatteryState): boolean {
  return state.charging
}

// Which battery icon to show. Charging overrides level; buckets otherwise.
export type BatteryLevel = "charging" | "full" | "medium" | "low" | "empty"

export function batteryLevel(
  level: number | null,
  charging: boolean
): BatteryLevel {
  if (charging) return "charging"
  if (level === null) return "empty"
  if (level > 0.66) return "full"
  if (level > 0.33) return "medium"
  if (level > 0.1) return "low"
  return "empty"
}

// Subscribe to the live battery reading. Returns an unsupported/empty state on
// non-Chromium browsers (Firefox removed the API, Safari never shipped it).
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    charging: false,
    level: null,
    supported: false,
  })

  useEffect(() => {
    const getBattery = (navigator as NavigatorWithBattery).getBattery
    if (typeof getBattery !== "function") return

    let manager: BatteryManager | null = null
    let cancelled = false
    const sync = (): void => {
      if (manager) {
        setState({
          charging: manager.charging,
          level: manager.level,
          supported: true,
        })
      }
    }

    getBattery
      .call(navigator)
      .then((m) => {
        if (cancelled) return
        manager = m
        sync()
        m.addEventListener("levelchange", sync)
        m.addEventListener("chargingchange", sync)
      })
      .catch(() => {
        /* getBattery can reject in some sandboxed frames — stay unsupported. */
      })

    return () => {
      cancelled = true
      if (manager) {
        manager.removeEventListener("levelchange", sync)
        manager.removeEventListener("chargingchange", sync)
      }
    }
  }, [])

  return state
}
