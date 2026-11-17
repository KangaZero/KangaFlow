"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bluetooth,
  BluetoothOff,
  type LucideIcon,
  Wifi,
  WifiLow,
  WifiOff,
} from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import type * as React from "react"

import {
  type BatteryLevel,
  batteryLevel,
  getBatteryPercentage,
  useBattery,
} from "@/lib/battery"
import { useBluetoothAvailable } from "@/lib/bluetooth"
import { type NetworkLevel, networkLevel, useNetwork } from "@/lib/network"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

const BATTERY_ICON: Record<BatteryLevel, LucideIcon> = {
  charging: BatteryCharging,
  empty: Battery,
  full: BatteryFull,
  low: BatteryLow,
  medium: BatteryMedium,
}

const WIFI_ICON: Record<NetworkLevel, LucideIcon> = {
  high: Wifi,
  low: WifiLow,
  off: WifiOff,
}

// Self-contained bar status cluster (own navigator hooks) so the bar itself
// stays prop-driven — mirrors how NotificationCenter is embedded. Replaces the
// old faux "CPU 12% MEM 43%" text with live battery + bluetooth-adapter state.
export function SystemStatus({
  vertical = false,
}: {
  vertical?: boolean
}): React.JSX.Element {
  const battery = useBattery()
  const bluetoothAvailable = useBluetoothAvailable()
  const network = useNetwork()
  const shouldReduceMotion = useReducedMotion()
  const { translate } = useLocale()

  const level = batteryLevel(battery.level, battery.charging)
  const BatteryIcon = BATTERY_ICON[level]
  const percent = getBatteryPercentage(battery.level)
  const known = battery.supported && percent !== null
  const BluetoothIcon = bluetoothAvailable ? Bluetooth : BluetoothOff
  const wifi = networkLevel(network)
  const WifiIcon = WIFI_ICON[wifi]

  // One spoken summary for the whole cluster (the icons themselves are
  // decorative), e.g. "Network: online · Bluetooth: on · Battery: 82%, charging".
  const summary = [
    `${translate("environment.bar.status.network")}: ${translate(`environment.bar.status.network_${wifi}`)}`,
    `${translate("environment.bar.status.bluetooth")}: ${translate(
      bluetoothAvailable
        ? "environment.bar.status.bluetoothOn"
        : "environment.bar.status.bluetoothOff"
    )}`,
    `${translate("environment.bar.status.battery")}: ${
      known ? `${percent}%` : translate("environment.bar.status.unknown")
    }${battery.charging ? `, ${translate("environment.bar.status.charging")}` : ""}`,
  ].join(" · ")

  return (
    <span
      aria-label={summary}
      className={cn(
        // One shared hover surface for the cluster instead of three targets.
        "text-foreground/72 hover:bg-foreground/8 flex items-center gap-2.5 rounded-lg transition-colors",
        vertical ? "flex-col px-0 py-2" : "h-7 px-2"
      )}
      role="img"
    >
      <WifiIcon
        aria-hidden
        className={cn("size-3.5", wifi === "off" && "text-destructive")}
      />
      <BluetoothIcon
        aria-hidden
        className={cn(
          "size-3.5",
          !bluetoothAvailable && "text-muted-foreground"
        )}
      />
      {/* Vertical bars: the percentage sits on its own line under the icon. */}
      <span
        className={cn(
          "flex items-center",
          vertical ? "flex-col gap-0.5" : "gap-1"
        )}
      >
        <motion.span
          // Charging pulses (opacity — a motion value MotionConfig's
          // reducedMotion doesn't cover, so guard it explicitly).
          animate={
            battery.charging && !shouldReduceMotion
              ? { opacity: [1, 0.4, 1] }
              : { opacity: 1 }
          }
          className="inline-flex"
          transition={
            battery.charging && !shouldReduceMotion
              ? {
                  duration: 1.6,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
              : { duration: 0 }
          }
        >
          <BatteryIcon
            aria-hidden
            className={cn(
              "size-4.25",
              !known && "text-muted-foreground",
              level === "low" && "text-destructive"
            )}
          />
        </motion.span>
        {percent !== null ? (
          <span
            className={cn(
              "tabular-nums",
              vertical ? "text-[0.625rem] leading-none" : "text-[0.71875rem]"
            )}
          >
            {percent}%
          </span>
        ) : null}
      </span>
    </span>
  )
}
