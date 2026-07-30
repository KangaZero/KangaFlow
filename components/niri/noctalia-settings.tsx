"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  AppWindow,
  ArrowLeft,
  Blend,
  Image as ImageIcon,
  LayoutGrid,
  type LucideIcon,
  Maximize,
  Monitor,
  Palette,
  PanelTop,
  SlidersHorizontal,
  Type,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useState } from "react"
import { GLASS_SURFACE } from "@/components/niri/glass"
import {
  ACCENT_COLORS,
  ACCENTS,
  type AccentId,
  BAR_OPACITIES,
  BAR_POSITIONS,
  type BarOpacity,
  type BarPosition,
  BORDER_RADIUS_MAX,
  BORDER_RADIUS_MIN,
  ENV_FONTS,
  type EnvFont,
  type EnvSettings,
  GLASS_LEVELS,
  type GlassLevel,
  UI_SCALES,
  type UiScale,
} from "@/components/niri/settings"
import { WallpaperPicker } from "@/components/niri/wallpaper-picker"
import { Slider } from "@/components/ui/slider"
import type { TranslationKey } from "@/lib/i18n"
import { THEMES, type Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const percent = (fraction: BarOpacity | UiScale): string =>
  `${Math.round(fraction * 100)}%`

// Sidebar sections, Noctalia v5-style (icon + label; content pane on the right).
type SectionId = "appearance" | "bar" | "launcher" | "wallpaper" | "widgets"
const SECTIONS: readonly {
  id: SectionId
  icon: LucideIcon
  labelKey: TranslationKey
}[] = [
  {
    icon: Palette,
    id: "appearance",
    labelKey: "environment.settings.appearance",
  },
  { icon: PanelTop, id: "bar", labelKey: "environment.settings.sectionBar" },
  {
    icon: AppWindow,
    id: "launcher",
    labelKey: "environment.settings.sectionLauncher",
  },
  {
    icon: ImageIcon,
    id: "wallpaper",
    labelKey: "environment.settings.wallpaper",
  },
  { icon: LayoutGrid, id: "widgets", labelKey: "environment.settings.widgets" },
]

// A small section heading paired with a lucide glyph.
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

// A grouped setting card in the content pane.
function SettingCard(props: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const { icon, title, children } = props
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <SectionLabel icon={icon}>{title}</SectionLabel>
      {children}
    </section>
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
  // Unique per instance so the sliding highlight only animates within this
  // control (only one settings section renders at a time, so labels don't clash).
  const layoutId = `segmented-${label}`
  return (
    <fieldset
      aria-label={label}
      className="inline-flex min-w-0 flex-wrap rounded-xl border border-border bg-muted/40 p-1"
    >
      {options.map((option) => {
        const selected = option === value
        return (
          <motion.button
            aria-pressed={selected}
            className="relative rounded-lg px-3 py-1.5 font-medium text-sm"
            key={String(option)}
            onClick={() => onSelect(option)}
            type="button"
            whileTap={{ scale: 0.94 }}
          >
            {selected ? (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                layoutId={layoutId}
                transition={{ damping: 32, stiffness: 400, type: "spring" }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 transition-colors",
                selected ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {format(option)}
            </span>
          </motion.button>
        )
      })}
    </fieldset>
  )
}

// A slider bound to a discrete option array (drives numeric settings). The
// slider tracks the option's ARRAY INDEX; the live label shows format(value).
function OptionSlider<T extends string | number>(props: {
  label: string
  options: readonly T[]
  value: T
  format: (option: T) => string
  onSelect: (option: T) => void
}): React.JSX.Element {
  const { label, options, value, format, onSelect } = props
  const index = Math.max(0, options.indexOf(value))
  return (
    <div className="flex flex-col gap-2">
      <span className="ml-auto font-medium text-muted-foreground text-xs tabular-nums">
        {format(value)}
      </span>
      <Slider
        aria-label={label}
        max={options.length - 1}
        min={0}
        onValueChange={(values) => {
          const next = options[values[0] ?? 0]
          if (next !== undefined) onSelect(next)
        }}
        step={1}
        value={[index]}
      />
    </div>
  )
}

// A free-range numeric slider (min → max, step of 1 by default).
function NumericSlider(props: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  format: (n: number) => string
  onSelect: (n: number) => void
}): React.JSX.Element {
  const { label, min, max, step = 1, value, format, onSelect } = props
  return (
    <div className="flex flex-col gap-2">
      <span className="ml-auto font-medium text-muted-foreground text-xs tabular-nums">
        {format(value)}
      </span>
      <Slider
        aria-label={label}
        max={max}
        min={min}
        onValueChange={(values) => {
          const next = values[0]
          if (next !== undefined) onSelect(next)
        }}
        step={step}
        value={[value]}
      />
    </div>
  )
}

// Accent swatch row. "default" previews the theme's own `--primary`.
function AccentRow(props: {
  value: AccentId
  onSelect: (accent: AccentId) => void
}): React.JSX.Element {
  const { value, onSelect } = props
  return (
    <div className="flex flex-wrap gap-2">
      {ACCENTS.map((accent) => {
        const selected = accent === value
        return (
          <button
            aria-label={accent}
            aria-pressed={selected}
            className={cn(
              "size-8 rounded-full border border-border/60 ring-primary ring-offset-2 ring-offset-card transition",
              selected && "ring-2"
            )}
            key={accent}
            onClick={() => onSelect(accent)}
            style={{
              backgroundColor:
                accent === "default" ? "var(--primary)" : ACCENT_COLORS[accent],
            }}
            type="button"
          />
        )
      })}
    </div>
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
  const { theme: activeTheme, toggleTheme } = useGlobalStates()
  const [section, setSection] = useState<SectionId>("appearance")
  const shouldReduceMotion = useReducedMotion()

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
          className={cn(
            "relative z-10 flex h-[min(32rem,88vh)] w-[min(52rem,94vw)] overflow-hidden text-foreground",
            GLASS_SURFACE[settings.glass]
          )}
          exit={{ opacity: 0, scale: 0.96 }}
          initial={{ opacity: 0, scale: 0.96 }}
          role="dialog"
          style={{ borderRadius: `${settings.windowRadius}px` }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {/* Sidebar */}
          <nav className="flex w-48 shrink-0 flex-col gap-1 border-border/60 border-r bg-muted/20 p-3">
            <span className="flex items-center">
              <h2 className="px-3 py-2 font-semibold text-sm">
                {translate("environment.settings.title")}
              </h2>
              <motion.span
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: -100 }}
                initial={{ opacity: 0.5, scale: 1, x: 50 }}
                role="button"
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.16,
                  ease: "easeIn",
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.span>
            </span>
            {SECTIONS.map((s) => {
              const active = s.id === section
              const Icon = s.icon
              return (
                <button
                  aria-current={active}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  type="button"
                >
                  <Icon aria-hidden className="size-4" />
                  {translate(s.labelKey)}
                </button>
              )
            })}
          </nav>

          {/* Content pane */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            {section === "appearance" ? (
              <>
                <SettingCard
                  icon={Palette}
                  title={translate("environment.settings.theme")}
                >
                  <Segmented<Theme>
                    format={(t) => translate(`theme.${t}`)}
                    label={translate("environment.settings.theme")}
                    onSelect={(t) => void toggleTheme(t, 250)}
                    options={THEMES}
                    value={activeTheme}
                  />
                </SettingCard>
                <SettingCard
                  icon={Palette}
                  title={translate("environment.settings.accent")}
                >
                  <AccentRow
                    onSelect={(accent) => set("accent", accent)}
                    value={settings.accent}
                  />
                </SettingCard>
                <SettingCard
                  icon={Type}
                  title={translate("environment.settings.font")}
                >
                  <Segmented<EnvFont>
                    format={(font) =>
                      translate(
                        font === "mono"
                          ? "environment.settings.fontMono"
                          : "environment.settings.fontSans"
                      )
                    }
                    label={translate("environment.settings.font")}
                    onSelect={(font) => set("font", font)}
                    options={ENV_FONTS}
                    value={settings.font}
                  />
                </SettingCard>
                <SettingCard
                  icon={Maximize}
                  title={translate("environment.settings.uiScale")}
                >
                  <OptionSlider<UiScale>
                    format={percent}
                    label={translate("environment.settings.uiScale")}
                    onSelect={(scale) => set("uiScale", scale)}
                    options={UI_SCALES}
                    value={settings.uiScale}
                  />
                </SettingCard>
                <SettingCard
                  icon={Blend}
                  title={translate("environment.settings.transparency")}
                >
                  <OptionSlider<GlassLevel>
                    format={(level) =>
                      translate(
                        level === "solid"
                          ? "environment.settings.transparencySolid"
                          : level === "soft"
                            ? "environment.settings.transparencySoft"
                            : "environment.settings.transparencyGlass"
                      )
                    }
                    label={translate("environment.settings.transparency")}
                    onSelect={(level) => set("glass", level)}
                    options={GLASS_LEVELS}
                    value={settings.glass}
                  />
                </SettingCard>
                <SettingCard
                  icon={SlidersHorizontal}
                  title={translate("environment.settings.corners")}
                >
                  <SectionLabel icon={SlidersHorizontal}>
                    {translate("environment.settings.windowRadius")}
                  </SectionLabel>
                  <NumericSlider
                    format={(r) => `${r}px`}
                    label={translate("environment.settings.windowRadius")}
                    max={BORDER_RADIUS_MAX}
                    min={BORDER_RADIUS_MIN}
                    onSelect={(r) => set("windowRadius", r)}
                    value={settings.windowRadius}
                  />
                </SettingCard>
              </>
            ) : section === "launcher" ? (
              <SettingCard
                icon={AppWindow}
                title={translate("environment.settings.sectionLauncher")}
              >
                <SectionLabel icon={SlidersHorizontal}>
                  {translate("environment.settings.launcherRadius")}
                </SectionLabel>
                <NumericSlider
                  format={(r) => `${r}px`}
                  label={translate("environment.settings.launcherRadius")}
                  max={BORDER_RADIUS_MAX}
                  min={BORDER_RADIUS_MIN}
                  onSelect={(r) => set("launcherRadius", r)}
                  value={settings.launcherRadius}
                />
              </SettingCard>
            ) : section === "bar" ? (
              <>
                <SettingCard
                  icon={PanelTop}
                  title={translate("environment.settings.barPosition")}
                >
                  <Segmented<BarPosition>
                    format={(position) =>
                      translate(
                        position === "top"
                          ? "environment.settings.barTop"
                          : position === "bottom"
                            ? "environment.settings.barBottom"
                            : position === "left"
                              ? "environment.settings.barLeft"
                              : "environment.settings.barRight"
                      )
                    }
                    label={translate("environment.settings.barPosition")}
                    onSelect={(position) => set("barPosition", position)}
                    options={BAR_POSITIONS}
                    value={settings.barPosition}
                  />
                </SettingCard>
                <SettingCard
                  icon={PanelTop}
                  title={translate("environment.settings.barOpacity")}
                >
                  <OptionSlider<BarOpacity>
                    format={percent}
                    label={translate("environment.settings.barOpacity")}
                    onSelect={(opacity) => set("barOpacity", opacity)}
                    options={BAR_OPACITIES}
                    value={settings.barOpacity}
                  />
                </SettingCard>
                <SettingCard
                  icon={SlidersHorizontal}
                  title={translate("environment.settings.corners")}
                >
                  <SectionLabel icon={SlidersHorizontal}>
                    {translate("environment.settings.barRadius")}
                  </SectionLabel>
                  <NumericSlider
                    format={(r) => `${r}px`}
                    label={translate("environment.settings.barRadius")}
                    max={BORDER_RADIUS_MAX}
                    min={BORDER_RADIUS_MIN}
                    onSelect={(r) => set("barRadius", r)}
                    value={settings.barRadius}
                  />
                </SettingCard>

                <SettingCard
                  icon={Monitor}
                  title={translate("environment.settings.systemMonitor")}
                >
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
                </SettingCard>
              </>
            ) : section === "wallpaper" ? (
              <SettingCard
                icon={ImageIcon}
                title={translate("environment.settings.wallpaper")}
              >
                <WallpaperPicker
                  onChange={(w) => set("wallpaper", w)}
                  value={settings.wallpaper}
                />
              </SettingCard>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-muted-foreground text-sm">
                {translate("environment.settings.widgetsSoon")}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
