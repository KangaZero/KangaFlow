"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/settings/pause-menu.css"
import "@/components/ui/slab-motion.css"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"

import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import { GlitchError } from "@/components/settings/glitch-error"
import { SettingsTitle } from "@/components/settings/settings-title"
import { StorageWarning } from "@/components/storage-warning"
import { EscCloseLabel } from "@/components/ui/esc-close-label"
import { ANIMATION_PREFS } from "@/lib/globalStates"
import { LOCALES } from "@/lib/i18n"
import { isReducedMotion } from "@/lib/isReducedMotion"
import {
  type MenuIntent,
  menuIntentFromKey,
  SETTINGS_TABS,
  type SettingsTab,
  wrapIndex,
} from "@/lib/menu-navigation"
import { playSfx } from "@/lib/sfx/play"
import {
  bindingFromKeyboardEvent,
  DEFAULT_SHORTCUTS,
  IS_MAC,
  type Shortcut,
  type ShortcutAction,
  type ShortcutProblem,
  shortcutProblem,
} from "@/lib/shortcuts"
import { THEMES } from "@/lib/themes"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// One choice in a multi-option row. Built with its own `choose` closure, so a
// row can cycle through options without the options' value types leaking out.
type Option = {
  key: string
  label: string
  selected: boolean
  choose: () => void
}

type MenuItem =
  | {
      kind: "shortcut"
      id: ShortcutAction
      label: string
      shortcut: Shortcut
      problem: ShortcutProblem | null
    }
  | {
      kind: "toggle"
      id: string
      label: string
      hint: string | null
      on: boolean
      set: (on: boolean) => void
    }
  | { kind: "choice"; id: string; label: string; options: readonly Option[] }
  | {
      kind: "action"
      id: string
      label: string
      disabled: boolean
      run: () => void
    }

const MODIFIERS = [
  { flag: "hasMetaOrCtrlKey", label: IS_MAC ? "⌘" : "Ctrl" },
  { flag: "hasAltOrOptionKey", label: IS_MAC ? "⌥" : "Alt" },
  { flag: "hasShiftKey", label: IS_MAC ? "⇧" : "Shift" },
] as const satisfies readonly {
  flag: keyof Omit<Shortcut, "action" | "character">
  label: string
}[]

const BROKE_FLASH_MS = 600

/**
 * Settings as a game-style pause menu ("A · Slanted panels"). Always
 * keyboard-driven while open: arrows or vim hjkl move and change, q/e or [ ]
 * page tabs, Enter/Space selects, Esc closes. Rebinding is a "press the new
 * combo" capture; the modifier LiquidButtons stay for mouse users.
 *
 * Radix Dialog directly (not the animate-ui wrapper): its 3D flip fights a
 * full-screen menu, while Radix still gives the focus trap, aria-modal and Esc.
 */
export function SettingsDialog() {
  const { translate, locale, setLocale } = useLocale()
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    shortcuts,
    setShortcuts,
    showChromeInEnvironment,
    setShowChromeInEnvironment,
    animationPref,
    setAnimationPref,
    vimMode,
    setVimMode,
    soundEffects,
    setSoundEffects,
    ambience,
    setAmbience,
    theme,
    toggleTheme,
  } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())

  const [tab, setTab] = useState<SettingsTab>("controls")
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [index, setIndex] = useState(0)
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)

  // Rows whose binding JUST became invalid get a one-shot hard glitch.
  const [justBroke, setJustBroke] = useState<ReadonlySet<ShortcutAction>>(
    new Set()
  )
  const previousProblems = useRef<ReadonlySet<ShortcutAction>>(new Set())
  useEffect(() => {
    const broken = new Set(
      shortcuts
        .filter((s) => shortcutProblem(s, shortcuts) !== null)
        .map((s) => s.action)
    )
    const fresh = [...broken].filter((a) => !previousProblems.current.has(a))
    previousProblems.current = broken
    if (fresh.length === 0) return
    setJustBroke(new Set(fresh))
    const timer = window.setTimeout(
      () => setJustBroke(new Set()),
      BROKE_FLASH_MS
    )
    return () => window.clearTimeout(timer)
  }, [shortcuts])

  const dirty = JSON.stringify(shortcuts) !== JSON.stringify(DEFAULT_SHORTCUTS)
  const onOff = (on: boolean) =>
    on ? translate("settings.on") : translate("settings.off")

  function itemsFor(current: SettingsTab): readonly MenuItem[] {
    switch (current) {
      case "controls":
        return [
          ...shortcuts.map(
            (shortcut): MenuItem => ({
              id: shortcut.action,
              kind: "shortcut",
              label: translate(`settings.actions.${shortcut.action}`),
              problem: shortcutProblem(shortcut, shortcuts),
              shortcut,
            })
          ),
          {
            disabled: !dirty,
            id: "reset",
            kind: "action",
            label: translate("settings.resetToDefaults"),
            run: () => setShortcuts([...DEFAULT_SHORTCUTS]),
          },
        ]
      case "audio":
        return [
          {
            hint: translate("settings.soundEffectsHint"),
            id: "sound",
            kind: "toggle",
            label: translate("settings.soundEffects"),
            on: soundEffects,
            set: setSoundEffects,
          },
          {
            hint: translate("settings.ambienceHint"),
            id: "ambience",
            kind: "toggle",
            label: translate("settings.ambience"),
            on: ambience,
            set: setAmbience,
          },
        ]
      case "display":
        return [
          {
            id: "theme",
            kind: "choice",
            label: translate("theme.label"),
            options: THEMES.map((t) => ({
              choose: () => void toggleTheme(t),
              key: t,
              label: translate(`theme.${t}`),
              selected: theme === t,
            })),
          },
          {
            id: "language",
            kind: "choice",
            label: translate("nav.language"),
            options: LOCALES.map((option) => ({
              choose: () => setLocale(option),
              key: option,
              // Endonyms ("English", "日本語"), readable whichever is active.
              label: translate(`command.locales.${option}`),
              selected: locale === option,
            })),
          },
          {
            id: "animation",
            kind: "choice",
            label: translate("settings.animation"),
            options: ANIMATION_PREFS.map((pref) => ({
              choose: () => setAnimationPref(pref),
              key: pref,
              label:
                pref === "system"
                  ? translate("settings.animationSystem")
                  : onOff(pref === "on"),
              selected: animationPref === pref,
            })),
          },
          {
            hint: null,
            id: "chrome",
            kind: "toggle",
            label: translate("settings.showChromeInEnvironment"),
            on: showChromeInEnvironment,
            set: setShowChromeInEnvironment,
          },
        ]
      case "system":
        return [
          {
            hint: null,
            id: "vim",
            kind: "toggle",
            label: translate("settings.enableVim"),
            on: vimMode,
            set: setVimMode,
          },
        ]
    }
  }

  const items = itemsFor(tab)
  const cursor = Math.min(index, items.length - 1)

  // A new tab starts at the top; within a tab, the cursor row stays in view as
  // j/k (or arrows) walk past the scroll edge.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tab` is the trigger; the body is read through a ref.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [tab])
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cursor` is the trigger; the row is found through the ref.
  useEffect(() => {
    bodyRef.current
      ?.querySelector('[data-cursor="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [cursor])

  // Open/close sounds follow the state, whichever path opened it (⌘, or UI).
  const wasOpen = useRef(isSettingsOpen)
  useEffect(() => {
    if (isSettingsOpen === wasOpen.current) return
    wasOpen.current = isSettingsOpen
    playSfx(isSettingsOpen ? "menu-open" : "menu-close")
    if (!isSettingsOpen) setCapturing(null)
  }, [isSettingsOpen])

  function switchTab(next: SettingsTab) {
    if (next === tab) return
    const from = SETTINGS_TABS.indexOf(tab)
    setDirection(SETTINGS_TABS.indexOf(next) > from ? "next" : "prev")
    setTab(next)
    setIndex(0)
    setCapturing(null)
    playSfx("menu-tab")
  }

  function patchShortcut(action: ShortcutAction, next: Partial<Shortcut>) {
    setShortcuts(
      shortcuts.map((s) => (s.action === action ? { ...s, ...next } : s))
    )
  }

  function cycleChoice(options: readonly Option[], delta: number) {
    const selected = options.findIndex((option) => option.selected)
    options[wrapIndex(selected, delta, options.length)]?.choose()
    playSfx("menu-move")
  }

  function activate(item: MenuItem) {
    switch (item.kind) {
      case "toggle":
        item.set(!item.on)
        playSfx(item.on ? "toggle-off" : "toggle-on")
        return
      case "choice":
        cycleChoice(item.options, 1)
        return
      case "shortcut":
        setCapturing(item.id)
        playSfx("toggle-on")
        return
      case "action":
        if (item.disabled) {
          playSfx("error-soft")
          return
        }
        item.run()
        playSfx("toggle-on")
    }
  }

  function runIntent(intent: MenuIntent) {
    const item = items[cursor]
    switch (intent) {
      case "up":
      case "down":
        setIndex(wrapIndex(cursor, intent === "up" ? -1 : 1, items.length))
        playSfx("menu-move")
        return
      case "nextTab":
      case "prevTab": {
        const from = SETTINGS_TABS.indexOf(tab)
        const next =
          SETTINGS_TABS[
            wrapIndex(from, intent === "nextTab" ? 1 : -1, SETTINGS_TABS.length)
          ]
        if (next) switchTab(next)
        return
      }
      case "left":
      case "right":
        if (item?.kind === "choice")
          cycleChoice(item.options, intent === "left" ? -1 : 1)
        else if (item?.kind === "toggle") activate(item)
        return
      case "select":
        if (item) activate(item)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (capturing) {
      // Swallow everything while capturing so a combo can't also fire a global
      // shortcut (the dispatcher skips defaultPrevented events). Esc is left to
      // onEscapeKeyDown, which cancels instead of closing.
      if (event.key === "Escape") return
      event.preventDefault()
      event.stopPropagation()
      const binding = bindingFromKeyboardEvent(event)
      if (!binding) return
      const next = shortcuts.map((s) =>
        s.action === capturing ? { ...s, ...binding } : s
      )
      const updated = next.find((s) => s.action === capturing)
      setShortcuts(next)
      setCapturing(null)
      playSfx(
        updated && shortcutProblem(updated, next) ? "error-soft" : "toggle-on"
      )
      return
    }
    const intent = menuIntentFromKey(event)
    // A Tab-focused button handles its own Enter/Space natively.
    if (intent === "select" && event.target instanceof HTMLButtonElement) return
    if (intent) {
      event.preventDefault()
      runIntent(intent)
      return
    }
    // Bare keys never leak to page shortcuts (e.g. "f" link hints) while the
    // menu is open; Tab (focus) and Esc (close) keep their native meaning.
    const bare = !(event.metaKey || event.ctrlKey || event.altKey)
    if (bare && event.key !== "Tab" && event.key !== "Escape")
      event.preventDefault()
  }

  const tabLabel = translate(`settings.tabs.${tab}`)

  return (
    <DialogPrimitive.Root
      onOpenChange={setIsSettingsOpen}
      open={isSettingsOpen}
    >
      <AnimatePresence>
        {isSettingsOpen ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Content
              asChild
              forceMount
              onEscapeKeyDown={(event) => {
                if (!capturing) return
                event.preventDefault()
                setCapturing(null)
                playSfx("toggle-off")
              }}
              onKeyDown={handleKeyDown}
              onOpenAutoFocus={(event) => {
                // Keyboard mode is always on: focus the menu itself rather than
                // the first button (which would be the neko N).
                event.preventDefault()
                contentRef.current?.focus()
              }}
            >
              <motion.div
                animate={{ opacity: 1 }}
                className="pause-menu"
                data-reduced={reduced}
                exit={{ opacity: 0, scale: 1.03 }}
                initial={{ opacity: 0 }}
                lang={locale}
                ref={contentRef}
                style={{ zIndex: Z_LAYERS.dialog }}
                tabIndex={-1}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                <div aria-hidden="true" className="pm-backdrop" />
                <div className="pm-shell">
                  <header className="pm-head">
                    <DialogPrimitive.Title className="sr-only">
                      {translate("settings.menuTitle")}
                    </DialogPrimitive.Title>
                    <SettingsTitle reduced={reduced} />
                    {locale === "ja" ? (
                      <span aria-hidden="true" className="pm-title-ja">
                        {translate("settings.menuTitle")}
                      </span>
                    ) : null}
                    <DialogPrimitive.Description className="pm-sub">
                      {translate("settings.description")}
                    </DialogPrimitive.Description>
                    <DialogPrimitive.Close
                      aria-label={translate("environment.settings.close")}
                      className="esc-close pm-close"
                    >
                      <EscCloseLabel />
                    </DialogPrimitive.Close>
                  </header>

                  <div className="pm-storage">
                    <StorageWarning />
                  </div>

                  <div
                    aria-label={translate("settings.menuTitle")}
                    className="pm-tabs"
                    role="tablist"
                  >
                    {SETTINGS_TABS.map((id, n) => (
                      <button
                        aria-controls={panelId}
                        aria-selected={id === tab}
                        className="pm-tab"
                        key={id}
                        onClick={() => switchTab(id)}
                        role="tab"
                        style={{ "--n": n }}
                        tabIndex={id === tab ? 0 : -1}
                        type="button"
                      >
                        {translate(`settings.tabs.${id}`)}
                      </button>
                    ))}
                  </div>

                  <div
                    className="pm-body"
                    data-tab={tabLabel}
                    id={panelId}
                    ref={bodyRef}
                    role="tabpanel"
                  >
                    {/* Keyed by tab: switching remounts (and re-animates) only
                        the content; value changes re-render in place. */}
                    <ul
                      aria-label={tabLabel}
                      className="pm-list"
                      data-dir={direction}
                      key={tab}
                    >
                      {items.map((item, i) => (
                        <MenuRow
                          active={i === cursor}
                          captureLabel={translate("settings.capturePrompt")}
                          capturing={
                            capturing !== null && capturing === item.id
                          }
                          errorTag={translate("settings.errorTag")}
                          errorText={
                            item.kind === "shortcut" && item.problem
                              ? translate(`settings.errors.${item.problem}`)
                              : null
                          }
                          index={i}
                          item={item}
                          justBroke={
                            item.kind === "shortcut" && justBroke.has(item.id)
                          }
                          key={item.id}
                          onActivate={() => {
                            setIndex(i)
                            activate(item)
                          }}
                          onHover={() => {
                            if (i === cursor || capturing) return
                            setIndex(i)
                            playSfx("menu-move")
                          }}
                          onModifier={(flag) => {
                            if (item.kind !== "shortcut") return
                            patchShortcut(item.id, {
                              [flag]: !item.shortcut[flag],
                            })
                            playSfx("menu-move")
                          }}
                          onOff={onOff}
                          onOption={(option) => {
                            option.choose()
                            playSfx("menu-move")
                          }}
                          onToggle={(on) => {
                            if (item.kind !== "toggle") return
                            item.set(on)
                            playSfx(on ? "toggle-on" : "toggle-off")
                          }}
                          reduced={reduced}
                        />
                      ))}
                    </ul>
                  </div>

                  <footer aria-hidden="true" className="pm-legend">
                    <Legend
                      keys={["↑↓", "jk"]}
                      label={translate("settings.legend.move")}
                    />
                    <Legend
                      keys={["←→", "hl"]}
                      label={translate("settings.legend.change")}
                    />
                    <Legend
                      keys={["Enter"]}
                      label={translate("settings.legend.select")}
                    />
                    <Legend
                      keys={["Q", "E"]}
                      label={translate("settings.legend.tab")}
                    />
                    <Legend
                      keys={["Esc"]}
                      label={translate("settings.legend.back")}
                    />
                  </footer>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function Legend({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <span>
      {keys.map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
      {label}
    </span>
  )
}

type MenuRowProps = {
  item: MenuItem
  index: number
  active: boolean
  capturing: boolean
  captureLabel: string
  errorTag: string
  errorText: string | null
  justBroke: boolean
  reduced: boolean
  onOff: (on: boolean) => string
  onActivate: () => void
  onHover: () => void
  onModifier: (flag: (typeof MODIFIERS)[number]["flag"]) => void
  onOption: (option: Option) => void
  onToggle: (on: boolean) => void
}

function MenuRow({
  item,
  index,
  active,
  capturing,
  captureLabel,
  errorTag,
  errorText,
  justBroke,
  reduced,
  onOff,
  onActivate,
  onHover,
  onModifier,
  onOption,
  onToggle,
}: MenuRowProps) {
  let value: ReactNode
  switch (item.kind) {
    case "shortcut":
      value = capturing ? (
        <span aria-live="assertive" className="pm-capture">
          {captureLabel}
        </span>
      ) : (
        <>
          {MODIFIERS.map(({ flag, label }) => (
            <LiquidButton
              aria-label={`${item.label} — ${label}`}
              aria-pressed={item.shortcut[flag]}
              className="pm-opt h-7 min-w-9 px-2 font-mono text-xs"
              defaultPressed={item.shortcut[flag]}
              key={flag}
              onClick={(event) => {
                event.stopPropagation()
                onModifier(flag)
              }}
              size="sm"
              type="button"
            >
              {label}
            </LiquidButton>
          ))}
          <span className="pm-key">
            {item.shortcut.character
              ? item.shortcut.character.toUpperCase()
              : "…"}
          </span>
        </>
      )
      break
    case "toggle":
      value = [true, false].map((on) => (
        <LiquidButton
          aria-pressed={item.on === on}
          className="pm-opt h-7 px-2.5 font-mono text-xs"
          defaultPressed={item.on === on}
          key={String(on)}
          onClick={(event) => {
            event.stopPropagation()
            onToggle(on)
          }}
          size="sm"
          type="button"
        >
          {onOff(on)}
        </LiquidButton>
      ))
      break
    case "choice":
      value = item.options.map((option) => (
        <LiquidButton
          aria-pressed={option.selected}
          className="pm-opt h-7 px-2.5 font-mono text-xs"
          defaultPressed={option.selected}
          key={option.key}
          onClick={(event) => {
            event.stopPropagation()
            onOption(option)
          }}
          size="sm"
          type="button"
        >
          {option.label}
        </LiquidButton>
      ))
      break
    case "action":
      value = (
        <LiquidButton
          className="pm-opt h-7 px-2.5 font-mono text-xs"
          disabled={item.disabled}
          onClick={(event) => {
            event.stopPropagation()
            onActivate()
          }}
          size="sm"
          type="button"
        >
          {item.label}
        </LiquidButton>
      )
  }

  return (
    // Rows are pointer targets mirroring the keyboard cursor; the buttons
    // inside are the accessible controls, so the row itself is not focusable.
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled by the menu (arrows/hjkl + Enter) and by the row's own buttons.
    <li
      aria-current={active ? "true" : undefined}
      aria-invalid={errorText !== null}
      className="pm-row"
      data-broke={justBroke}
      data-cursor={active}
      onClick={onActivate}
      onMouseEnter={onHover}
      style={{ "--i": index }}
    >
      {active ? (
        <motion.span
          aria-hidden="true"
          className="pm-cursor"
          layoutId="pause-menu-cursor"
          transition={
            reduced
              ? { duration: 0 }
              : { damping: 26, stiffness: 520, type: "spring" }
          }
        />
      ) : null}
      <span>
        <span className="pm-label">{item.label}</span>
        {item.kind === "toggle" && item.hint ? (
          <span className="pm-hint">{item.hint}</span>
        ) : null}
      </span>
      <span className="pm-value">{value}</span>
      {errorText ? (
        <GlitchError
          message={errorText}
          play={justBroke}
          reduced={reduced}
          tag={errorTag}
        />
      ) : null}
    </li>
  )
}
