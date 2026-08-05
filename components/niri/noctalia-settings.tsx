"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  AppWindow,
  ArrowLeft,
  Bell,
  Blend,
  ChevronDown,
  Crosshair,
  Eye,
  EyeOff,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  ListOrdered,
  type LucideIcon,
  Maximize,
  Monitor,
  Palette,
  PanelTop,
  RotateCcw,
  ShieldCheck,
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
  TOAST_DURATIONS,
  TOAST_MAX_STACKS,
  TOAST_POSITIONS,
  type ToastDuration,
  type ToastMaxStack,
  type ToastPosition,
  UI_SCALES,
  type UiScale,
  WIDGET_ANCHORS,
  WIDGET_IDS,
  WIDGET_STATE_STORAGE_PREFIX,
  WIDGET_STORAGE_KEYS,
  type WidgetAnchor,
  type WidgetId,
  type WidgetStartup,
} from "@/components/niri/settings"
import { WallpaperPicker } from "@/components/niri/wallpaper-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import {
  clearStoredPassword,
  hasStoredPassword,
  setStoredPassword,
} from "@/lib/auth"
import {
  NOTE_LINE_NUMBER_MODES,
  type NoteLineNumbers,
} from "@/lib/globalStates"
import type { TranslationKey } from "@/lib/i18n"
import {
  SPRING_PANEL,
  SPRING_SEGMENTED,
  TWEEN_QUICK,
  TWEEN_SMOOTH,
} from "@/lib/motion"
import { THEMES, type Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const percent = (fraction: BarOpacity | UiScale): string =>
  `${Math.round(fraction * 100)}%`

// `as const satisfies` keeps each value's literal key type, so translate()
// resolves to a plain string (a bare TranslationKey would widen to the union
// of ALL leaf values, some of which are arrays).
const WIDGET_ANCHOR_LABEL = {
  "bottom-left": "environment.settings.widgetAnchorBottomLeft",
  "bottom-right": "environment.settings.widgetAnchorBottomRight",
  center: "environment.settings.widgetAnchorCenter",
  "top-left": "environment.settings.widgetAnchorTopLeft",
  "top-right": "environment.settings.widgetAnchorTopRight",
} as const satisfies Record<WidgetAnchor, TranslationKey>

const WIDGET_NAME_KEY = {
  alarm: "widgets.alarm.title",
  calendar: "widgets.calendar.title",
  media: "mediaPlayer.title",
  notes: "widgets.notes.title",
} as const satisfies Record<WidgetId, TranslationKey>

const NOTE_LINE_NUMBER_LABEL = {
  absolute: "environment.settings.lineNumbersAbsolute",
  off: "settings.off",
  relative: "environment.settings.lineNumbersRelative",
} as const satisfies Record<NoteLineNumbers, TranslationKey>

// Read the live drag offset a widget persisted (for "apply current position").
function readWidgetOffset(storageKey: string): { x: number; y: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(WIDGET_STATE_STORAGE_PREFIX + storageKey) ??
        "{}"
    )
    const pos =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>).position
        : null
    if (pos && typeof pos === "object") {
      const p = pos as Record<string, unknown>
      if (typeof p.x === "number" && typeof p.y === "number") {
        return { x: p.x, y: p.y }
      }
    }
    return null
  } catch {
    return null
  }
}

// Sidebar sections, Noctalia v5-style (icon + label; content pane on the right).
type SectionId =
  | "appearance"
  | "bar"
  | "launcher"
  | "notifications"
  | "security"
  | "wallpaper"
  | "widgets"
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
  {
    icon: Bell,
    id: "notifications",
    labelKey: "environment.settings.sectionNotifications",
  },
  {
    icon: ShieldCheck,
    id: "security",
    labelKey: "environment.settings.sectionSecurity",
  },
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
                transition={SPRING_SEGMENTED}
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

function SecuritySection(): React.JSX.Element {
  const [pwdInput, setPwdInput] = useState("")
  const [confirmInput, setConfirmInput] = useState("")
  const [feedback, setFeedback] = useState<{
    msg: string
    ok: boolean
  } | null>(null)
  const [isSet, setIsSet] = useState(
    () => typeof window !== "undefined" && hasStoredPassword()
  )

  async function handleSet(): Promise<void> {
    if (pwdInput !== confirmInput) {
      setFeedback({ msg: "Passwords do not match", ok: false })
      return
    }
    await setStoredPassword(pwdInput)
    setIsSet(hasStoredPassword())
    setPwdInput("")
    setConfirmInput("")
    setFeedback({
      msg: pwdInput ? "Password set" : "Password cleared",
      ok: true,
    })
  }

  function handleClear(): void {
    clearStoredPassword()
    setIsSet(false)
    setPwdInput("")
    setConfirmInput("")
    setFeedback({ msg: "Password cleared", ok: true })
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"

  return (
    <SettingCard icon={ShieldCheck} title="Security">
      <p className="text-muted-foreground text-xs">
        Status:{" "}
        <span className={isSet ? "text-primary" : "text-muted-foreground"}>
          {isSet ? "Password set" : "No password (open access)"}
        </span>
      </p>

      <input
        className={inputClass}
        onChange={(e) => setPwdInput(e.target.value)}
        placeholder="New password (empty = remove)"
        type="password"
        value={pwdInput}
      />
      <input
        className={inputClass}
        onChange={(e) => setConfirmInput(e.target.value)}
        placeholder="Confirm password"
        type="password"
        value={confirmInput}
      />

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg border border-primary/60 bg-primary/10 py-2 font-medium text-primary text-sm transition-colors hover:bg-primary/20"
          onClick={() => void handleSet()}
          type="button"
        >
          Set Password
        </button>
        <button
          className="rounded-lg border border-border px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted/60 hover:text-destructive disabled:opacity-40"
          disabled={!isSet}
          onClick={handleClear}
          type="button"
        >
          Clear
        </button>
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs ${feedback.ok ? "text-emerald-500" : "text-destructive"}`}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {feedback.msg}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </SettingCard>
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
  const {
    theme: activeTheme,
    toggleTheme,
    isNotesOpen,
    isAlarmOpen,
    isCalendarOpen,
    isMediaPlayerOpen,
    noteLineNumbers,
    setNoteLineNumbers,
  } = useGlobalStates()
  const widgetOpen: Record<WidgetId, boolean> = {
    alarm: isAlarmOpen,
    calendar: isCalendarOpen,
    media: isMediaPlayerOpen,
    notes: isNotesOpen,
  }
  const [section, setSection] = useState<SectionId>("appearance")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const shouldReduceMotion = useReducedMotion()

  // Patch a single field and hand the whole object back. The generic key/value
  // pairing keeps every call site type-checked against `EnvSettings`.
  const set = <K extends keyof EnvSettings>(
    key: K,
    value: EnvSettings[K]
  ): void => {
    onChange({ ...settings, [key]: value })
  }

  // Patch one widget's startup config within the widgetDefaults map.
  const setWidget = (
    id: WidgetId,
    patch: Partial<WidgetStartup<WidgetId>>
  ): void => {
    set("widgetDefaults", {
      ...settings.widgetDefaults,
      [id]: { ...settings.widgetDefaults[id], ...patch },
    })
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

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: Z_LAYERS.panel }}
        >
          {/* Overlay — click anywhere outside the panel to dismiss. */}
          <button
            aria-label={translate("environment.settings.close")}
            className="fixed inset-0 cursor-default bg-background/40"
            onClick={onClose}
            type="button"
          />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={translate("environment.settings.title")}
            aria-modal="true"
            className={cn(
              "relative z-10 flex h-[min(32rem,88vh)] w-[min(52rem,94vw)] flex-col overflow-hidden text-foreground",
              GLASS_SURFACE[settings.glass]
            )}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            role="dialog"
            style={{ borderRadius: `${settings.windowRadius}px` }}
            transition={TWEEN_QUICK}
          >
            {/* Header — always visible; mobile shows dropdown + close, desktop shows title + sidebar toggle */}
            <div className="flex shrink-0 items-center gap-2 border-border/60 border-b px-4 py-2.5">
              {/* Mobile: section dropdown picker */}
              <div className="flex flex-1 items-center md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-sm hover:bg-muted/60"
                      type="button"
                    >
                      {(() => {
                        const s =
                          SECTIONS.find((x) => x.id === section) ?? SECTIONS[0]
                        if (!s) return null
                        const Icon = s.icon
                        return (
                          <>
                            <Icon aria-hidden className="size-4" />
                            {translate(s.labelKey)}
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          </>
                        )
                      })()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {SECTIONS.map((s) => {
                      const Icon = s.icon
                      return (
                        <DropdownMenuItem
                          key={s.id}
                          onClick={() => setSection(s.id)}
                        >
                          <Icon aria-hidden className="mr-2 size-4" />
                          {translate(s.labelKey)}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop: settings title */}
              <h2 className="hidden flex-1 px-1 font-semibold text-sm md:block">
                {translate("environment.settings.title")}
              </h2>

              {/* Mobile: ArrowLeft closes the dialog */}
              <button
                aria-label={translate("environment.settings.close")}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:hidden"
                onClick={onClose}
                type="button"
              >
                <ArrowLeft className="size-5" />
              </button>

              {/* Desktop: ArrowLeft toggles sidebar open/closed */}
              <button
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                className="hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:inline-flex"
                onClick={() => setSidebarOpen((prev) => !prev)}
                type="button"
              >
                <motion.span
                  animate={{ rotate: sidebarOpen ? 0 : 180 }}
                  style={{ display: "inline-flex" }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : SPRING_PANEL
                  }
                >
                  <ArrowLeft className="size-5" />
                </motion.span>
              </button>
            </div>

            {/* Body: sidebar nav + content pane */}
            <div className="flex min-h-0 flex-1">
              {/* Sidebar nav — desktop only, collapsible via ArrowLeft */}
              <AnimatePresence initial={false}>
                {sidebarOpen ? (
                  <motion.nav
                    animate={{ opacity: 1, width: 176 }}
                    className="hidden shrink-0 flex-col gap-1 overflow-hidden border-border/60 border-r bg-muted/20 py-3 md:flex"
                    exit={{ opacity: 0, width: 0 }}
                    initial={{ opacity: 0, width: 0 }}
                    key="sidebar"
                    transition={
                      shouldReduceMotion ? { duration: 0 } : SPRING_PANEL
                    }
                  >
                    <div className="flex flex-col gap-1 px-3">
                      {SECTIONS.map((s) => {
                        const active = s.id === section
                        const Icon = s.icon
                        return (
                          <button
                            aria-current={active}
                            className={cn(
                              "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors",
                              active
                                ? "text-primary"
                                : "text-muted-foreground hover:bg-muted/60"
                            )}
                            key={s.id}
                            onClick={() => setSection(s.id)}
                            type="button"
                          >
                            {active ? (
                              <motion.span
                                className="absolute inset-0 rounded-lg bg-primary/15"
                                layoutId="settings-nav-pill"
                                transition={TWEEN_SMOOTH}
                              />
                            ) : null}
                            <Icon
                              aria-hidden
                              className="relative size-4 shrink-0"
                            />
                            <span className="relative truncate">
                              {translate(s.labelKey)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.nav>
                ) : null}
              </AnimatePresence>

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
                    <SettingCard
                      icon={HelpCircle}
                      title={translate("environment.settings.showHint")}
                    >
                      <button
                        aria-pressed={settings.showStartingHint}
                        className={cn(
                          "inline-flex w-fit items-center gap-2 rounded-xl border border-border px-3 py-1.5 font-medium text-sm transition-colors",
                          settings.showStartingHint
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-foreground hover:bg-muted/70"
                        )}
                        onClick={() =>
                          set("showStartingHint", !settings.showStartingHint)
                        }
                        type="button"
                      >
                        <HelpCircle aria-hidden="true" className="size-4" />
                        {settings.showStartingHint
                          ? translate("settings.on")
                          : translate("settings.off")}
                      </button>
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
                    <SettingCard
                      icon={PanelTop}
                      title={translate("environment.settings.autoHideBar")}
                    >
                      <button
                        aria-pressed={settings.autoHideBar}
                        className={cn(
                          "inline-flex w-fit items-center gap-2 rounded-xl border border-border px-3 py-1.5 font-medium text-sm transition-colors",
                          settings.autoHideBar
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-foreground hover:bg-muted/70"
                        )}
                        onClick={() =>
                          set("autoHideBar", !settings.autoHideBar)
                        }
                        type="button"
                      >
                        <PanelTop aria-hidden="true" className="size-4" />
                        {settings.autoHideBar
                          ? translate("settings.on")
                          : translate("settings.off")}
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
                ) : section === "notifications" ? (
                  <SettingCard
                    icon={Bell}
                    title={translate(
                      "environment.settings.sectionNotifications"
                    )}
                  >
                    <SectionLabel icon={Bell}>
                      {translate("environment.settings.toastPosition")}
                    </SectionLabel>
                    <Segmented<ToastPosition>
                      format={(p) =>
                        translate(
                          p === "top-left"
                            ? "environment.settings.toastPositionTopLeft"
                            : p === "top-right"
                              ? "environment.settings.toastPositionTopRight"
                              : p === "bottom-left"
                                ? "environment.settings.toastPositionBottomLeft"
                                : "environment.settings.toastPositionBottomRight"
                        )
                      }
                      label={translate("environment.settings.toastPosition")}
                      onSelect={(p) => set("toastPosition", p)}
                      options={TOAST_POSITIONS}
                      value={settings.toastPosition}
                    />

                    <SectionLabel icon={SlidersHorizontal}>
                      {translate("environment.settings.toastDuration")}
                    </SectionLabel>
                    <Segmented<ToastDuration>
                      format={(d) =>
                        translate(
                          d === 3000
                            ? "environment.settings.toastDuration3s"
                            : d === 5000
                              ? "environment.settings.toastDuration5s"
                              : d === 8000
                                ? "environment.settings.toastDuration8s"
                                : "environment.settings.toastDuration12s"
                        )
                      }
                      label={translate("environment.settings.toastDuration")}
                      onSelect={(d) => set("toastDuration", d)}
                      options={TOAST_DURATIONS}
                      value={settings.toastDuration}
                    />

                    <SectionLabel icon={LayoutGrid}>
                      {translate("environment.settings.toastMaxStack")}
                    </SectionLabel>
                    <Segmented<ToastMaxStack>
                      format={(n) =>
                        translate(
                          n === 1
                            ? "environment.settings.toastMaxStack1"
                            : n === 3
                              ? "environment.settings.toastMaxStack3"
                              : n === 5
                                ? "environment.settings.toastMaxStack5"
                                : "environment.settings.toastMaxStack8"
                        )
                      }
                      label={translate("environment.settings.toastMaxStack")}
                      onSelect={(n) => set("toastMaxStack", n)}
                      options={TOAST_MAX_STACKS}
                      value={settings.toastMaxStack}
                    />
                  </SettingCard>
                ) : section === "security" ? (
                  <SecuritySection />
                ) : (
                  WIDGET_IDS.map((id) => {
                    const wd = settings.widgetDefaults[id]
                    const isOpen = widgetOpen[id]
                    return (
                      <SettingCard
                        icon={LayoutGrid}
                        key={id}
                        title={translate(WIDGET_NAME_KEY[id])}
                      >
                        {/* Show on startup */}
                        <button
                          aria-pressed={wd.show}
                          className={cn(
                            "inline-flex w-fit items-center gap-2 rounded-xl border border-border px-3 py-1.5 font-medium text-sm transition-colors",
                            wd.show
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/40 text-foreground hover:bg-muted/70"
                          )}
                          onClick={() => setWidget(id, { show: !wd.show })}
                          type="button"
                        >
                          {wd.show ? (
                            <Eye aria-hidden className="size-4" />
                          ) : (
                            <EyeOff aria-hidden className="size-4" />
                          )}
                          {translate("environment.settings.widgetShowStartup")}
                        </button>

                        {/* Default position anchor */}
                        <SectionLabel icon={LayoutGrid}>
                          {translate("environment.settings.widgetPosition")}
                        </SectionLabel>
                        <Segmented<WidgetAnchor>
                          format={(a) => translate(WIDGET_ANCHOR_LABEL[a])}
                          label={translate(
                            "environment.settings.widgetPosition"
                          )}
                          onSelect={(a) => setWidget(id, { anchor: a })}
                          options={WIDGET_ANCHORS}
                          value={wd.anchor}
                        />

                        {/* Apply current / reset offset */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-medium text-sm transition-colors",
                              isOpen
                                ? "bg-muted/40 hover:bg-muted/70"
                                : "cursor-not-allowed opacity-50"
                            )}
                            disabled={!isOpen}
                            onClick={() => {
                              const offset = readWidgetOffset(
                                WIDGET_STORAGE_KEYS[id]
                              )
                              if (offset) setWidget(id, { offset })
                            }}
                            type="button"
                          >
                            <Crosshair aria-hidden className="size-3.5" />
                            {translate(
                              "environment.settings.widgetApplyCurrent"
                            )}
                          </button>
                          {wd.offset ? (
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted-foreground text-sm hover:text-foreground"
                              onClick={() => setWidget(id, { offset: null })}
                              type="button"
                            >
                              <RotateCcw aria-hidden className="size-3.5" />
                              {translate(
                                "environment.settings.widgetResetPosition"
                              )}
                            </button>
                          ) : null}
                        </div>
                        {isOpen ? null : (
                          <p className="text-muted-foreground text-xs">
                            {translate(
                              "environment.settings.widgetOpenToApply"
                            )}
                          </p>
                        )}

                        {/* Notes: vim-style line-number gutter */}
                        {id === "notes" ? (
                          <>
                            <SectionLabel icon={ListOrdered}>
                              {translate(
                                "environment.settings.noteLineNumbers"
                              )}
                            </SectionLabel>
                            <Segmented<NoteLineNumbers>
                              format={(m) =>
                                translate(NOTE_LINE_NUMBER_LABEL[m])
                              }
                              label={translate(
                                "environment.settings.noteLineNumbers"
                              )}
                              onSelect={setNoteLineNumbers}
                              options={NOTE_LINE_NUMBER_MODES}
                              value={noteLineNumbers}
                            />
                          </>
                        ) : null}
                      </SettingCard>
                    )
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
