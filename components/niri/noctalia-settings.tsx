"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Image as ImageIcon,
  type LucideIcon,
  Maximize,
  Monitor,
  PanelTop,
  Type,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"
import {
  BAR_OPACITIES,
  BAR_POSITIONS,
  type BarOpacity,
  type BarPosition,
  ENV_FONTS,
  type EnvFont,
  type EnvSettings,
  UI_SCALES,
  type UiScale,
} from "@/components/niri/settings"
import { WallpaperPicker } from "@/components/niri/wallpaper-picker"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

const percent = (fraction: BarOpacity | UiScale): string =>
  `${Math.round(fraction * 100)}%`

/**
 * A small section heading paired with a lucide glyph.
 */
function SectionLabel(props: {
  icon: LucideIcon
  children: React.ReactNode
}): React.JSX.Element {
  const { icon: Icon, children } = props
  return (
    <h3 className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
      <Icon aria-hidden="true" className="size-3.5" />
      {children}
    </h3>
  )
}

/**
 * Exhaustively-typed segmented control. `T` is a single field's literal union,
 * so `options` can only be that field's exact set and `onSelect` yields the
 * same literal type — no widening to bare `string`/`number`.
 */
function Segmented<T extends string | number>(props: {
  label: string
  options: readonly T[]
  value: T
  format: (option: T) => string
  onSelect: (option: T) => void
}): React.JSX.Element {
  const { label, options, value, format, onSelect } = props
  return (
    <fieldset
      aria-label={label}
      className="inline-flex min-w-0 rounded-xl border border-border bg-muted/40 p-1"
    >
      {options.map((option) => {
        const selected = option === value
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium text-sm transition-colors",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-muted/70"
            )}
            key={String(option)}
            onClick={() => onSelect(option)}
            type="button"
          >
            {format(option)}
          </button>
        )
      })}
    </fieldset>
  )
}

export function NoctaliaSettings(props: {
  open: boolean
  settings: EnvSettings
  onChange: (next: EnvSettings) => void
  onClose: () => void
}): React.JSX.Element | null {
  const { open, settings, onChange, onClose } = props
  const { translate } = useLocale()

  // Patch a single field and hand the whole object back. The generic key/value
  // pairing keeps every call site type-checked against `EnvSettings`.
  const set = <K extends keyof EnvSettings>(
    key: K,
    value: EnvSettings[K]
  ): void => {
    onChange({ ...settings, [key]: value })
  }

  // Esc closes, no matter where focus sits within the desktop.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay — click anywhere outside the panel to dismiss. */}
        <button
          aria-label={translate("environment.settings.close")}
          className="fixed inset-0 cursor-default bg-background/40"
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          aria-label={translate("environment.settings.title")}
          aria-modal="true"
          className="relative z-10 flex max-h-[85vh] w-[min(34rem,92vw)] flex-col gap-6 overflow-y-auto rounded-2xl border border-border bg-card/90 p-6 text-foreground shadow-2xl backdrop-blur-xl"
          exit={{ opacity: 0, scale: 0.96 }}
          initial={{ opacity: 0, scale: 0.96 }}
          role="dialog"
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {/* Wallpaper */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={ImageIcon}>
              {translate("environment.settings.wallpaper")}
            </SectionLabel>
            <WallpaperPicker
              onChange={(w) => set("wallpaper", w)}
              value={settings.wallpaper}
            />
          </section>

          {/* Bar position */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={PanelTop}>
              {translate("environment.settings.barPosition")}
            </SectionLabel>
            <Segmented<BarPosition>
              format={(position) =>
                translate(
                  position === "top"
                    ? "environment.settings.barTop"
                    : "environment.settings.barBottom"
                )
              }
              label="Bar position"
              onSelect={(position) => set("barPosition", position)}
              options={BAR_POSITIONS}
              value={settings.barPosition}
            />
          </section>

          {/* Bar opacity */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={PanelTop}>
              {translate("environment.settings.barOpacity")}
            </SectionLabel>
            <Segmented<BarOpacity>
              format={percent}
              label="Bar opacity"
              onSelect={(opacity) => set("barOpacity", opacity)}
              options={BAR_OPACITIES}
              value={settings.barOpacity}
            />
          </section>

          {/* Font */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={Type}>
              {translate("environment.settings.font")}
            </SectionLabel>
            <Segmented<EnvFont>
              format={(font) =>
                translate(
                  font === "mono"
                    ? "environment.settings.fontMono"
                    : "environment.settings.fontSans"
                )
              }
              label="Font"
              onSelect={(font) => set("font", font)}
              options={ENV_FONTS}
              value={settings.font}
            />
          </section>

          {/* UI scale */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={Maximize}>
              {translate("environment.settings.uiScale")}
            </SectionLabel>
            <Segmented<UiScale>
              format={percent}
              label="UI scale"
              onSelect={(scale) => set("uiScale", scale)}
              options={UI_SCALES}
              value={settings.uiScale}
            />
          </section>

          {/* System monitor */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={Monitor}>
              {translate("environment.settings.systemMonitor")}
            </SectionLabel>
            <button
              aria-pressed={settings.showSystemMonitor}
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-xl border border-border px-3 py-1.5 font-medium text-sm transition-colors",
                settings.showSystemMonitor
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-foreground hover:bg-muted/70"
              )}
              onClick={() =>
                set("showSystemMonitor", !settings.showSystemMonitor)
              }
              type="button"
            >
              <Monitor aria-hidden="true" className="size-4" />
              {settings.showSystemMonitor
                ? translate("environment.settings.monitorShown")
                : translate("environment.settings.monitorHidden")}
            </button>
          </section>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
