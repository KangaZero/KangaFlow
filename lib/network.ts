"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Online status + connection quality for the bar's faux system monitor. Uses
// `navigator.onLine` (+ online/offline events) everywhere, and the Network
// Information API (`navigator.connection`, Chromium-only) for the quality tier.

import { useEffect, useState } from "react"

export type NetworkState = {
  online: boolean
  // NetworkInformation.effectiveType: "slow-2g" | "2g" | "3g" | "4g" | null.
  effectiveType: string | null
}

type Connection = EventTarget & { effectiveType?: string }
type NavigatorWithConnection = Navigator & { connection?: Connection }

// off → no connection; low → 3g or slower; high → 4g or unknown (assume good).
export type NetworkLevel = "off" | "low" | "high"

export function networkLevel(state: NetworkState): NetworkLevel {
  if (!state.online) return "off"
  const type = state.effectiveType
  if (type === "slow-2g" || type === "2g" || type === "3g") return "low"
  return "high"
}

export function useNetwork(): NetworkState {
  // Start "online" so SSR and the first client render agree (navigator.onLine
  // defaults true); the effect corrects it right after mount.
  const [state, setState] = useState<NetworkState>({
    effectiveType: null,
    online: true,
  })

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection
    const sync = (): void => {
      setState({
        effectiveType: connection?.effectiveType ?? null,
        online: navigator.onLine,
      })
    }
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    connection?.addEventListener("change", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
      connection?.removeEventListener("change", sync)
    }
  }, [])

  return state
}
