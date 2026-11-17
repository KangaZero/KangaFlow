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
import { GLASS_SURFACE, WINDOW_ELEVATION } from "@/components/niri/glass"
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
import { StorageWarning } from "@/components/storage-warning"
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
import { isReducedMotion } from "@/lib/isReducedMotion"
import {
  SPRING_PANEL,
  SPRING_PILL,
  SPRING_SEGMENTED,
  TWEEN_QUICK,
} from "@/lib/motion"
import { safeLocalStorage } from "@/lib/safe-storage"
import { playSfx } from "@/lib/sfx/play"
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
  keyboard: "widgets.keyboard.title",
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
  return safeLocalStorage.getJson<{ x: number; y: number } | null>(
    WIDGET_STATE_STORAGE_PREFIX + storageKey,
    null,
    (raw) => {
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
    }
  )
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

// A small sub-heading inside a group (frosted-shell: quiet, sentence case).
function SectionLabel(props: {
  icon: LucideIcon
  children: React.ReactNode
}): React.JSX.Element {
  const { icon: Icon, children } = props
  return (
    <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      <Icon aria-hidden="true" className="size-3.5" />
      {children}
    </h4>
  )
}

// A grouped setting in the content pane: an inset, hairline-ringed glass group
// with a tinted icon tile + title. `action` sits on the title row (switches),
// `children` stack underneath (segmented controls, sliders, pickers).
function SettingCard(props: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
  children?: React.ReactNode
}): React.JSX.Element {
  const { icon: Icon, title, action, children } = props
  return (
    <section className="bg-foreground/[0.035] ring-foreground/10 flex flex-col gap-3 rounded-xl px-4 py-3.5 ring-1 ring-inset">
      <div className="flex min-h-7 items-center gap-2.5">
        <span className="bg-foreground/[0.08] text-muted-foreground grid size-6 shrink-0 place-items-center rounded-md">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        <h3 className="flex-1 truncate text-[13px] font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * iOS-style switch: the thumb stretches while pressed and springs across when
 * toggled. Pure presentation over an existing boolean setting — the caller
 * keeps the exact same onToggle it always had.
 */
function ToggleSwitch(props: {
  label: string
  checked: boolean
  onToggle: () => void
  stateLabel?: string
  reduce: boolean
}): React.JSX.Element {
  const { label, checked, onToggle, stateLabel, reduce } = props
  return (
    <span className="flex items-center gap-2.5">
      {stateLabel ? (
        <span className="text-muted-foreground text-xs tabular-nums">
          {stateLabel}
        </span>
      ) : null}
      <button
        aria-checked={checked}
        aria-label={label}
        className={cn(
          "group focus-visible:outline-primary relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2",
          checked ? "bg-primary" : "bg-foreground/15",
          !reduce && "transition-colors duration-200"
        )}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.08)]",
            checked
              ? "translate-x-[18px] group-active:translate-x-[13px]"
              : "translate-x-0",
            "group-active:w-[25px]",
            !reduce &&
              "transition-[translate,width] duration-300 ease-[cubic-bezier(0.32,1.25,0.5,1)]"
          )}
        />
      </button>
    </span>
  )
}

// Radix slider skin: hairline track, white thumb that grows while dragged.
// Applied via descendant selectors so the shared ui/slider stays untouched.
const SLIDER_SKIN =
  "[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.12)] [&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]:active]:scale-115 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-foreground/15"

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
      className="bg-foreground/[0.08] inline-flex w-fit min-w-0 flex-wrap rounded-[10px] p-0.5"
    >
      {options.map((option) => {
        const selected = option === value
        return (
          <motion.button
            aria-pressed={selected}
            className="focus-visible:outline-primary relative rounded-lg px-3 py-1.5 text-[13px] focus-visible:outline-2"
            key={String(option)}
            onClick={() => onSelect(option)}
            type="button"
            whileTap={{ scale: 0.94 }}
          >
            {selected ? (
              <motion.span
                aria-hidden
                className="bg-card absolute inset-0 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.14),0_0_0_0.5px_var(--border)]"
                layoutId={layoutId}
                transition={SPRING_SEGMENTED}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 transition-colors",
                selected
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
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
      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
        {format(value)}
      </span>
      <Slider
        aria-label={label}
        className={SLIDER_SKIN}
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
      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
        {format(value)}
      </span>
      <Slider
        aria-label={label}
        className={SLIDER_SKIN}
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
    <div className="flex flex-wrap gap-2.5">
      {ACCENTS.map((accent) => {
        const selected = accent === value
        return (
          <button
            aria-label={accent}
            aria-pressed={selected}
            className={cn(
              "ring-offset-card focus-visible:outline-primary size-6 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] ring-offset-2 transition-transform duration-300 ease-[cubic-bezier(0.32,1.25,0.5,1)] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none",
              selected && "ring-2 ring-[currentColor]"
            )}
            key={accent}
            onClick={() => onSelect(accent)}
            style={{
              backgroundColor:
                accent === "default" ? "var(--primary)" : ACCENT_COLORS[accent],
              color:
                accent === "default" ? "var(--primary)" : ACCENT_COLORS[accent],
            }}
            type="button"
          />
        )
      })}
    </div>
  )
}

// Feedback is stored as a typed kind, not a message string, so the text is
// looked up in the CURRENT locale at render time (switching EN/JA re-translates).
type SecurityFeedback = "mismatch" | "set" | "cleared"
const SECURITY_FEEDBACK = {
  cleared: { key: "environment.settings.security.feedbackCleared", ok: true },
  mismatch: {
    key: "environment.settings.security.feedbackMismatch",
    ok: false,
  },
  set: { key: "environment.settings.security.feedbackSet", ok: true },
} as const satisfies Record<
  SecurityFeedback,
  { key: TranslationKey; ok: boolean }
>

function SecuritySection(): React.JSX.Element {
  const { translate } = useLocale()
  const [pwdInput, setPwdInput] = useState("")
  const [confirmInput, setConfirmInput] = useState("")
  const [feedback, setFeedback] = useState<SecurityFeedback | null>(null)
  // hasStoredPassword() goes through safeLocalStorage, which is already
  // server-safe — no `typeof window` guard needed.
  const [isSet, setIsSet] = useState(hasStoredPassword)

  async function handleSet(): Promise<void> {
    if (pwdInput !== confirmInput) {
      setFeedback("mismatch")
      playSfx("error-soft")
      return
    }
    await setStoredPassword(pwdInput)
    setIsSet(hasStoredPassword())
    setPwdInput("")
    setConfirmInput("")
    setFeedback(pwdInput ? "set" : "cleared")
  }

  function handleClear(): void {
    clearStoredPassword()
    setIsSet(false)
    setPwdInput("")
    setConfirmInput("")
    setFeedback("cleared")
  }

  const inputClass =
    "w-full rounded-[10px] border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-3 focus:ring-primary/25"

  return (
    <SettingCard
      icon={ShieldCheck}
      title={translate("environment.settings.sectionSecurity")}
    >
      <p className="text-muted-foreground text-xs">
        {translate("environment.settings.security.status")}{" "}
        <span className={isSet ? "text-primary" : "text-muted-foreground"}>
          {isSet
            ? translate("environment.settings.security.statusSet")
            : translate("environment.settings.security.statusOpen")}
        </span>
      </p>

      <input
        className={inputClass}
        onChange={(e) => setPwdInput(e.target.value)}
        placeholder={translate("environment.settings.security.newPlaceholder")}
        type="password"
        value={pwdInput}
      />
      <input
        className={inputClass}
        onChange={(e) => setConfirmInput(e.target.value)}
        placeholder={translate(
          "environment.settings.security.confirmPlaceholder"
        )}
        type="password"
        value={confirmInput}
      />

      <div className="flex gap-2">
        <button
          className="bg-primary text-primary-foreground flex-1 rounded-lg py-2 text-sm font-medium transition-[filter,transform] hover:brightness-105 active:scale-[0.98]"
          onClick={() => void handleSet()}
          type="button"
        >
          {translate("environment.settings.security.set")}
        </button>
        <button
          className="bg-foreground/[0.08] text-muted-foreground hover:text-destructive rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40"
          disabled={!isSet}
          onClick={handleClear}
          type="button"
        >
          {translate("environment.settings.security.clear")}
        </button>
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs ${SECURITY_FEEDBACK[feedback].ok ? "text-primary" : "text-destructive"}`}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {translate(SECURITY_FEEDBACK[feedback].key)}
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
    isKeyboardOpen,
    isMediaPlayerOpen,
    noteLineNumbers,
    setNoteLineNumbers,
    animationPref,
  } = useGlobalStates()
  const widgetOpen: Record<WidgetId, boolean> = {
    alarm: isAlarmOpen,
    calendar: isCalendarOpen,
    keyboard: isKeyboardOpen,
    media: isMediaPlayerOpen,
    notes: isNotesOpen,
  }
  const [section, setSection] = useState<SectionId>("appearance")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const reduce = isReducedMotion(animationPref, useReducedMotion())

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
            className="bg-background/40 fixed inset-0 cursor-default"
            onClick={onClose}
            type="button"
          />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={translate("environment.settings.title")}
            aria-modal="true"
            className={cn(
              "text-foreground relative z-10 flex h-[min(32rem,88vh)] w-[min(52rem,94vw)] flex-col overflow-hidden",
              GLASS_SURFACE[settings.glass],
              WINDOW_ELEVATION.rest
            )}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            role="dialog"
            style={{ borderRadius: `${settings.windowRadius}px` }}
            transition={TWEEN_QUICK}
          >
            {/* Header — always visible; mobile shows dropdown + close, desktop shows title + sidebar toggle */}
            <div className="border-foreground/10 flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
              {/* Mobile: section dropdown picker */}
              <div className="flex flex-1 items-center md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="hover:bg-muted/60 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium"
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
                            <ChevronDown className="text-muted-foreground size-3.5" />
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
              <h2 className="hidden flex-1 px-1 text-[13px] font-semibold md:block">
                {translate("environment.settings.title")}
              </h2>

              {/* Mobile: ArrowLeft closes the dialog */}
              <button
                aria-label={translate("environment.settings.close")}
                className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground rounded-lg p-1.5 transition-colors md:hidden"
                onClick={onClose}
                type="button"
              >
                <ArrowLeft className="size-5" />
              </button>

              {/* Desktop: ArrowLeft toggles sidebar open/closed */}
              <button
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-primary hidden rounded-lg p-1.5 transition-colors focus-visible:outline-2 md:inline-flex"
                onClick={() => setSidebarOpen((prev) => !prev)}
                type="button"
              >
                <motion.span
                  animate={{ rotate: sidebarOpen ? 0 : 180 }}
                  style={{ display: "inline-flex" }}
                  transition={reduce ? { duration: 0 } : SPRING_PANEL}
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
                    animate={{ opacity: 1, width: 196 }}
                    className="border-foreground/10 bg-foreground/[0.025] hidden shrink-0 flex-col gap-1 overflow-hidden border-r py-3 md:flex"
                    exit={{ opacity: 0, width: 0 }}
                    initial={{ opacity: 0, width: 0 }}
                    key="sidebar"
                    transition={reduce ? { duration: 0 } : SPRING_PANEL}
                  >
                    <div className="flex flex-col gap-0.5 px-2.5">
                      {SECTIONS.map((s) => {
                        const active = s.id === section
                        const Icon = s.icon
                        return (
                          <button
                            aria-current={active}
                            className={cn(
                              "focus-visible:outline-primary relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-2",
                              active
                                ? "text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            key={s.id}
                            onClick={() => setSection(s.id)}
                            type="button"
                          >
                            {active ? (
                              <motion.span
                                className="bg-foreground/10 absolute inset-0 rounded-lg"
                                layoutId="settings-nav-pill"
                                transition={
                                  reduce ? { duration: 0 } : SPRING_PILL
                                }
                              />
                            ) : null}
                            <span
                              className={cn(
                                "relative grid size-6 shrink-0 place-items-center rounded-md transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-foreground/[0.08]"
                              )}
                            >
                              <Icon aria-hidden className="size-3.5" />
                            </span>
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
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pt-5 pb-6">
                <StorageWarning />
                {(() => {
                  const current =
                    SECTIONS.find((x) => x.id === section) ?? SECTIONS[0]
                  return current ? (
                    <motion.h2
                      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                      className="mb-1 text-[22px] font-semibold tracking-[-0.01em]"
                      initial={
                        reduce
                          ? false
                          : { filter: "blur(8px)", opacity: 0, y: 6 }
                      }
                      key={`title-${current.id}`}
                      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      {translate(current.labelKey)}
                    </motion.h2>
                  ) : null
                })()}
                <motion.div
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                  initial={
                    reduce ? false : { filter: "blur(6px)", opacity: 0, y: 8 }
                  }
                  key={`body-${section}`}
                  transition={{
                    delay: reduce ? 0 : 0.05,
                    duration: 0.38,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
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
                                  : level === "true"
                                    ? "environment.settings.transparencyTrue"
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
                        action={
                          <ToggleSwitch
                            checked={settings.showStartingHint}
                            label={translate("environment.settings.showHint")}
                            onToggle={() =>
                              set(
                                "showStartingHint",
                                !settings.showStartingHint
                              )
                            }
                            reduce={reduce}
                            stateLabel={
                              settings.showStartingHint
                                ? translate("settings.on")
                                : translate("settings.off")
                            }
                          />
                        }
                        icon={HelpCircle}
                        title={translate("environment.settings.showHint")}
                      />
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
                        action={
                          <ToggleSwitch
                            checked={settings.showSystemMonitor}
                            label={translate(
                              "environment.settings.systemMonitor"
                            )}
                            onToggle={() =>
                              set(
                                "showSystemMonitor",
                                !settings.showSystemMonitor
                              )
                            }
                            reduce={reduce}
                            stateLabel={
                              settings.showSystemMonitor
                                ? translate("environment.settings.monitorShown")
                                : translate(
                                    "environment.settings.monitorHidden"
                                  )
                            }
                          />
                        }
                        icon={Monitor}
                        title={translate("environment.settings.systemMonitor")}
                      />
                      <SettingCard
                        action={
                          <ToggleSwitch
                            checked={settings.autoHideBar}
                            label={translate(
                              "environment.settings.autoHideBar"
                            )}
                            onToggle={() =>
                              set("autoHideBar", !settings.autoHideBar)
                            }
                            reduce={reduce}
                            stateLabel={
                              settings.autoHideBar
                                ? translate("settings.on")
                                : translate("settings.off")
                            }
                          />
                        }
                        icon={PanelTop}
                        title={translate("environment.settings.autoHideBar")}
                      />
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
                          <div className="flex items-center gap-2">
                            {wd.show ? (
                              <Eye
                                aria-hidden
                                className="text-muted-foreground size-3.5"
                              />
                            ) : (
                              <EyeOff
                                aria-hidden
                                className="text-muted-foreground size-3.5"
                              />
                            )}
                            <span className="flex-1 text-[13px]">
                              {translate(
                                "environment.settings.widgetShowStartup"
                              )}
                            </span>
                            <ToggleSwitch
                              checked={wd.show}
                              label={`${translate(WIDGET_NAME_KEY[id])}: ${translate("environment.settings.widgetShowStartup")}`}
                              onToggle={() => setWidget(id, { show: !wd.show })}
                              reduce={reduce}
                            />
                          </div>

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
                                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-[background-color,transform]",
                                isOpen
                                  ? "bg-foreground/[0.08] hover:bg-foreground/[0.12] active:scale-[0.97]"
                                  : "bg-foreground/[0.05] cursor-not-allowed opacity-50"
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
                                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm"
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
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
