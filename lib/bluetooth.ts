"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Web Bluetooth adapter availability. NOTE: getAvailability only reports whether
// the device HAS a Bluetooth radio — the API can't passively enumerate connected
// devices (that needs a user-gesture pairing), so this drives an
// on/off adapter icon, not a "connected devices" count.

import { useEffect, useState } from "react"

type BluetoothNavigator = Navigator & {
  bluetooth?: { getAvailability?: () => Promise<boolean> }
}

// null while unknown (pre-effect / SSR); false when the API is missing
// (Firefox, Safari) or reports no adapter.
export function useBluetoothAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const bluetooth = (navigator as BluetoothNavigator).bluetooth
    if (typeof bluetooth?.getAvailability !== "function") {
      setAvailable(false)
      return
    }
    let cancelled = false
    bluetooth
      .getAvailability()
      .then((value) => {
        if (!cancelled) setAvailable(value)
      })
      .catch(() => {
        if (!cancelled) setAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return available
}
