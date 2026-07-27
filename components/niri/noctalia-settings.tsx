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
  WALLPAPERS,
  type WallpaperId,
} from "@/components/niri/settings"
import { cn } from "@/lib/utils"

// Illustrative-only swatch backgrounds. Keyed by the `WallpaperId` union so a
// new wallpaper surfaces a missing-key type error here rather than a blank
// swatch. Inline gradients are allowed for these preview tiles.
const WALLPAPER_SWATCHES: Record<WallpaperId, React.CSSProperties> = {
  aurora: {
    backgroundImage:
      "linear-gradient(135deg, #1a2a6c 0%, #2a9d8f 45%, #b6f0c4 100%)",
  },
  catppuccin: { backgroundColor: "#cba6f7" },
  mesh: {
    backgroundImage:
      "conic-gradient(from 180deg at 50% 50%, #f72585, #7209b7, #3a0ca3, #4361ee, #4cc9f0, #f72585)",
  },
  solid: { backgroundColor: "#264653" },
}

const WALLPAPER_LABELS: Record<WallpaperId, string> = {
  aurora: "Aurora",
  catppuccin: "Catppuccin",
  mesh: "Mesh",
  solid: "Solid",
}

const FONT_LABELS: Record<EnvFont, string> = {
  mono: "Mono",
  sans: "Sans",
}

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
          aria-label="Close settings"
          className="fixed inset-0 cursor-default bg-background/40"
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          aria-label="Desktop settings"
          aria-modal="true"
          className="relative z-10 flex max-h-[85vh] w-[min(34rem,92vw)] flex-col gap-6 overflow-y-auto rounded-2xl border border-border bg-card/90 p-6 text-foreground shadow-2xl backdrop-blur-xl"
          exit={{ opacity: 0, scale: 0.96 }}
          initial={{ opacity: 0, scale: 0.96 }}
          role="dialog"
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {/* Wallpaper */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={ImageIcon}>Wallpaper</SectionLabel>
            <div className="flex flex-wrap gap-3">
              {WALLPAPERS.map((w: WallpaperId) => {
                const selected = settings.wallpaper === w
                return (
                  <button
                    aria-label={WALLPAPER_LABELS[w]}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-1 transition-transform",
                      selected && "scale-105"
                    )}
                    key={w}
                    onClick={() => set("wallpaper", w)}
                    type="button"
                  >
                    <div
                      className={cn(
                        "size-14 rounded-lg border border-border ring-offset-2 ring-offset-card transition-shadow",
                        selected && "ring-2 ring-primary"
                      )}
                      style={WALLPAPER_SWATCHES[w]}
                    />
                    <span className="text-muted-foreground text-xs">
                      {WALLPAPER_LABELS[w]}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Bar position */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={PanelTop}>Bar position</SectionLabel>
            <Segmented<BarPosition>
              format={(position) => (position === "top" ? "Top" : "Bottom")}
              label="Bar position"
              onSelect={(position) => set("barPosition", position)}
              options={BAR_POSITIONS}
              value={settings.barPosition}
            />
          </section>

          {/* Bar opacity */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={PanelTop}>Bar opacity</SectionLabel>
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
            <SectionLabel icon={Type}>Font</SectionLabel>
            <Segmented<EnvFont>
              format={(font) => FONT_LABELS[font]}
              label="Font"
              onSelect={(font) => set("font", font)}
              options={ENV_FONTS}
              value={settings.font}
            />
          </section>

          {/* UI scale */}
          <section className="flex flex-col gap-3">
            <SectionLabel icon={Maximize}>UI scale</SectionLabel>
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
            <SectionLabel icon={Monitor}>System monitor</SectionLabel>
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
              {settings.showSystemMonitor ? "Shown" : "Hidden"}
            </button>
          </section>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
