"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// On-screen keyboard widget: the owner's Corne v4 split board with their real
// Vial keymap (Colemak-DH base, Lower / Raise / Adjust; mockup Variant B). Two glass slabs — one per half, each draggable on its own
// — and a floating capsule with the layer tabs, the ext-key toggle, "Hide
// keyboard frame", dock/float and close. Taps type at the caret of the last
// focused field without stealing focus; hold-tap keys act on hold; the
// physical keyboard lights the key with the matching legend. Behaviour lives in lib/corne-engine, data in
// lib/corne-layout, caret edits in lib/text-target.

import "@/components/widgets/keyboard-widget.css"

import {
  EyeOff,
  GripVertical,
  Keyboard,
  Lock,
  PanelBottom,
  PictureInPicture2,
  X,
} from "lucide-react"
import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import type { KeyboardEvent, PointerEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal, flushSync } from "react-dom"

import { GLASS_SURFACE } from "@/components/niri/glass"
import {
  WIDGET_ANCHOR_CLASS,
  WIDGET_STATE_STORAGE_PREFIX,
  WIDGET_STORAGE_KEYS,
} from "@/components/niri/settings"
import { CorneKeycap, type KeycapKind } from "@/components/widgets/corne-keycap"
import {
  activeLayer,
  applyShift,
  isCtrlActive,
  isLayerKeyEngaged,
  isShiftActive,
  type NavDirection,
  nearestKey,
  type ShiftMode,
} from "@/lib/corne-engine"
import {
  type Binding,
  bindingAt,
  CORNE_KEYS,
  type CorneKey,
  charNameOf,
  HALVES,
  type Half,
  holdOf,
  isCharToken,
  isFnToken,
  isInertBinding,
  type KeyId,
  type KeyToken,
  LAYER_IDS,
  type LayerId,
  NONE,
  tapOf,
} from "@/lib/corne-layout"
import { useCorneKeyboard } from "@/lib/hooks/use-corne-keyboard"
import { isReducedMotion } from "@/lib/isReducedMotion"
import {
  type DockMode,
  type KeyboardPrefs,
  type Offset,
  parseKeyboardPrefs,
} from "@/lib/keyboard-prefs"
import { SPRING_CONTENT } from "@/lib/motion"
import { safeLocalStorage } from "@/lib/safe-storage"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const STORAGE_KEY = WIDGET_STATE_STORAGE_PREFIX + WIDGET_STORAGE_KEYS.keyboard

// Dropping the capsule within this many px of the bottom edge docks it.
const DOCK_SNAP_PX = 26
// Arrow-key nudge for the grips (px).
const NUDGE_PX = 12

const NAV_KEYS: Partial<Record<string, NavDirection>> = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
}

const NUDGE: Partial<Record<string, Offset>> = {
  ArrowDown: { x: 0, y: NUDGE_PX },
  ArrowLeft: { x: -NUDGE_PX, y: 0 },
  ArrowRight: { x: NUDGE_PX, y: 0 },
  ArrowUp: { x: 0, y: -NUDGE_PX },
}

const FIRST_KEY: KeyId = "L-0-1"

type FocusRequest = "toggle" | "dot" | null

function loadPrefs(): KeyboardPrefs {
  return safeLocalStorage.getJson(
    STORAGE_KEY,
    parseKeyboardPrefs(null),
    parseKeyboardPrefs
  )
}

function savePrefs(patch: Partial<KeyboardPrefs>): void {
  safeLocalStorage.setJson(STORAGE_KEY, { ...loadPrefs(), ...patch })
}

// Drag bounds (in offset space) that keep `el` inside the viewport.
function viewportBounds(el: HTMLElement, x: number, y: number) {
  const rect = el.getBoundingClientRect()
  return {
    bottom: y + (window.innerHeight - rect.bottom),
    left: x - rect.left,
    right: x + (window.innerWidth - rect.right),
    top: y - rect.top,
  }
}

const readOffset = (
  x: MotionValue<number>,
  y: MotionValue<number>
): Offset => ({
  x: x.get(),
  y: y.get(),
})

function keycapKind(binding: Binding): KeycapKind {
  const tap = tapOf(binding)
  if (tap === NONE) return "none"
  if (isInertBinding(binding)) return "inert"
  return isCharToken(tap) ? "char" : "mod"
}

export function KeyboardWidget(): React.JSX.Element | null {
  const {
    isKeyboardOpen,
    setIsKeyboardOpen,
    envSettings,
    setEnvSettings,
    animationPref,
  } = useGlobalStates()
  const { translate } = useLocale()
  const reduce = isReducedMotion(animationPref, useReducedMotion())
  const anchor = envSettings.widgetDefaults.keyboard.anchor
  const defaultOffset = envSettings.widgetDefaults.keyboard.offset
  // Shared with the settings panel (EnvSettings is the one source of truth).
  const { qwertyMapping } = envSettings.widgetDefaults.keyboard.options

  const [mounted, setMounted] = useState(false)
  const [prefs] = useState<KeyboardPrefs>(loadPrefs)
  const [dock, setDock] = useState<DockMode>(prefs.dock)
  const [showExt, setShowExt] = useState(prefs.showExt)
  const [frameless, setFrameless] = useState(false)
  const [dockHint, setDockHint] = useState(false)
  const [draggingHalf, setDraggingHalf] = useState<Half | null>(null)
  const [focusKey, setFocusKey] = useState<KeyId>(FIRST_KEY)
  const [announcement, setAnnouncement] = useState("")

  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const dotRef = useRef<HTMLButtonElement>(null)
  const keyRefs = useRef(new Map<KeyId, HTMLButtonElement>())
  const pointers = useRef(new Map<number, KeyId>())
  const focusRequest = useRef<FocusRequest>(null)
  const rootBounds = useRef({ bottom: 0, left: 0, right: 0, top: 0 })
  const halfBounds = useRef({ bottom: 0, left: 0, right: 0, top: 0 })

  const floatHome = prefs.position ?? defaultOffset ?? { x: 0, y: 0 }
  const rootX = useMotionValue(floatHome.x)
  const rootY = useMotionValue(floatHome.y)
  const rootDrag = useDragControls()
  const leftX = useMotionValue(prefs.halves.L.x)
  const leftY = useMotionValue(prefs.halves.L.y)
  const rightX = useMotionValue(prefs.halves.R.x)
  const rightY = useMotionValue(prefs.halves.R.y)
  const leftDrag = useDragControls()
  const rightDrag = useDragControls()
  const halfMotion = {
    L: { controls: leftDrag, x: leftX, y: leftY },
    R: { controls: rightDrag, x: rightX, y: rightY },
  } as const satisfies Record<Half, unknown>

  const flashKey = useCallback(
    (id: KeyId): void => {
      const el = keyRefs.current.get(id)
      if (el === undefined || reduce) return
      void animate(el, { opacity: [1, 0.45, 1] }, { duration: 0.22 })
    },
    [reduce]
  )

  const { engine, lit, press, release, dispatch, focusTarget } =
    useCorneKeyboard({
      isOpen: isKeyboardOpen,
      onInert: flashKey,
      qwertyMapping,
      rootRef,
    })
  const layer = activeLayer(engine)
  const shiftOn = isShiftActive(engine)
  const ctrlOn = isCtrlActive(engine)

  useEffect(() => setMounted(true), [])

  // ── announcements (aria-live) ──
  const announce = useCallback(
    (message: string): void => setAnnouncement(message),
    []
  )
  const layerLabel = (id: LayerId): string =>
    translate(`widgets.keyboard.layers.${id}.label`)
  const lastLayer = useRef<LayerId>(layer)
  const lastShift = useRef<ShiftMode>(engine.shiftMode)
  // biome-ignore lint/correctness/useExhaustiveDependencies: announce only on a real layer/shift change; translate is read at that moment
  useEffect(() => {
    if (layer !== lastLayer.current) {
      lastLayer.current = layer
      announce(
        translate("widgets.keyboard.announce.layer")
          .replace(
            "{layer}",
            translate(`widgets.keyboard.layers.${layer}.label`)
          )
          .replace("{sub}", translate(`widgets.keyboard.layers.${layer}.sub`))
      )
    }
    if (engine.shiftMode !== lastShift.current) {
      lastShift.current = engine.shiftMode
      announce(
        translate(
          engine.shiftMode === "caps"
            ? "widgets.keyboard.announce.caps"
            : engine.shiftMode === "oneshot"
              ? "widgets.keyboard.announce.shiftOneShot"
              : "widgets.keyboard.announce.shiftOff"
        )
      )
    }
  }, [layer, engine.shiftMode, announce])

  // ── frame toggle ──
  const showFrame = useCallback((): void => {
    focusRequest.current = "toggle"
    setFrameless(false)
    announce(translate("widgets.keyboard.announce.frameRestored"))
  }, [announce, translate])

  const hideFrame = (viaKeyboard: boolean): void => {
    // The toggle is about to vanish: keyboard users land on the restore dot;
    // pointer users keep focus in their text field.
    focusRequest.current = viaKeyboard ? "dot" : null
    setFrameless(true)
    announce(translate("widgets.keyboard.announce.frameHidden"))
  }

  // Focus moves after the attribute flips (the capsule is visible again).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on the frameless flip only
  useEffect(() => {
    const request = focusRequest.current
    focusRequest.current = null
    if (request === "toggle") toggleRef.current?.focus({ preventScroll: true })
    if (request === "dot") dotRef.current?.focus({ preventScroll: true })
  }, [frameless])

  // Esc restores the frame (capture phase, so a field's own Esc handling can't
  // swallow it first). Only while frameless — otherwise Esc is left alone.
  useEffect(() => {
    if (!(isKeyboardOpen && frameless)) return
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return
      event.preventDefault()
      showFrame()
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [isKeyboardOpen, frameless, showFrame])

  // ── open / close / dock ──
  const close = (): void => {
    pointers.current.clear()
    setFrameless(false)
    setDockHint(false)
    focusTarget()
    setIsKeyboardOpen(false)
  }

  const changeDock = (next: DockMode): void => {
    setDock(next)
    savePrefs({ dock: next })
    announce(
      translate(
        next === "bottom"
          ? "widgets.keyboard.announce.docked"
          : "widgets.keyboard.announce.undocked"
      )
    )
  }

  const toggleDock = (): void => {
    if (dock === "bottom") {
      const home = loadPrefs().position ?? defaultOffset ?? { x: 0, y: 0 }
      rootX.set(home.x)
      rootY.set(home.y)
      changeDock("float")
    } else {
      changeDock("bottom")
    }
  }

  const toggleQwertyMapping = (): void => {
    setEnvSettings((prev) => ({
      ...prev,
      widgetDefaults: {
        ...prev.widgetDefaults,
        keyboard: {
          ...prev.widgetDefaults.keyboard,
          options: {
            ...prev.widgetDefaults.keyboard.options,
            qwertyMapping: !prev.widgetDefaults.keyboard.options.qwertyMapping,
          },
        },
      },
    }))
  }

  const toggleExt = (): void => {
    const next = !showExt
    setShowExt(next)
    savePrefs({ showExt: next })
  }

  // Capsule grip: moves the whole keyboard. Dragging from the dock floats it in
  // place first (no jump): zero the offset, render floating, then offset by the
  // gap between where it was and its floating home.
  const startMove = (event: PointerEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    const root = rootRef.current
    if (root === null) return
    if (dock === "bottom") {
      const before = root.getBoundingClientRect()
      rootX.set(0)
      rootY.set(0)
      flushSync(() => setDock("float"))
      const home = root.getBoundingClientRect()
      rootX.set(before.left - home.left)
      rootY.set(before.top - home.top)
    }
    Object.assign(
      rootBounds.current,
      viewportBounds(root, rootX.get(), rootY.get())
    )
    rootDrag.start(event)
  }

  const onRootDrag = (): void => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) setDockHint(rect.bottom >= window.innerHeight - DOCK_SNAP_PX)
  }

  const onRootDragEnd = (): void => {
    if (dockHint) {
      setDockHint(false)
      changeDock("bottom")
      return
    }
    savePrefs({ dock: "float", position: readOffset(rootX, rootY) })
  }

  const nudgeRoot = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const delta = NUDGE[event.key]
    if (delta === undefined) return
    event.preventDefault()
    if (dock === "bottom") toggleDock()
    rootX.set(rootX.get() + delta.x)
    rootY.set(rootY.get() + delta.y)
    savePrefs({ position: readOffset(rootX, rootY) })
  }

  // Half grips: each slab drags on its own; double-click / Home snaps it home.
  const saveHalves = (): void =>
    savePrefs({
      halves: { L: readOffset(leftX, leftY), R: readOffset(rightX, rightY) },
    })

  const startHalfDrag = (
    half: Half,
    event: PointerEvent<HTMLButtonElement>
  ): void => {
    event.preventDefault()
    const slab = event.currentTarget.parentElement
    const { controls, x, y } = halfMotion[half]
    if (slab)
      Object.assign(halfBounds.current, viewportBounds(slab, x.get(), y.get()))
    setDraggingHalf(half)
    controls.start(event)
  }

  const resetHalf = (half: Half): void => {
    const { x, y } = halfMotion[half]
    if (reduce) {
      x.set(0)
      y.set(0)
    } else {
      void animate(x, 0, SPRING_CONTENT)
      void animate(y, 0, SPRING_CONTENT)
    }
    savePrefs({
      halves: {
        ...loadPrefs().halves,
        [half]: { x: 0, y: 0 },
      },
    })
  }

  const nudgeHalf = (
    half: Half,
    event: KeyboardEvent<HTMLButtonElement>
  ): void => {
    if (event.key === "Home") {
      event.preventDefault()
      resetHalf(half)
      return
    }
    const delta = NUDGE[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const { x, y } = halfMotion[half]
    x.set(x.get() + delta.x)
    y.set(y.get() + delta.y)
    saveHalves()
  }

  // ── keys ──
  const registerRef = useCallback(
    (id: KeyId, el: HTMLButtonElement | null): void => {
      if (el) keyRefs.current.set(id, el)
      else keyRefs.current.delete(id)
    },
    []
  )

  const onKeyPointerDown = useCallback(
    (id: KeyId, event: PointerEvent<HTMLButtonElement>): void => {
      // Keeps focus — and the caret — in the text field.
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      pointers.current.set(event.pointerId, id)
      press(id, "pointer", event.timeStamp)
    },
    [press]
  )

  const onKeyPointerEnd = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      const id = pointers.current.get(event.pointerId)
      if (id === undefined) return
      pointers.current.delete(event.pointerId)
      release(id, event.timeStamp)
    },
    [release]
  )

  const onKeyKeyDown = useCallback(
    (id: KeyId, event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === "Enter" || event.key === " ") {
        // preventDefault also stops the button's synthetic click.
        event.preventDefault()
        if (!event.repeat) press(id, "keyboard", event.timeStamp)
        return
      }
      const direction = NAV_KEYS[event.key]
      if (direction === undefined) return
      event.preventDefault()
      // Arrow keys skip hidden extension keys and keys that cannot act.
      const next = nearestKey(
        id,
        direction,
        (key) =>
          (showExt || key.kind !== "ext") &&
          !isInertBinding(bindingAt(layer, key))
      )
      if (next === null) return
      setFocusKey(next)
      keyRefs.current.get(next)?.focus()
    },
    [press, showExt, layer]
  )

  const onKeyKeyUp = useCallback(
    (id: KeyId, event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      release(id, event.timeStamp)
    },
    [release]
  )

  const onAssistiveClick = useCallback(
    (id: KeyId): void => {
      const at = performance.now()
      press(id, "assistive", at)
      release(id, at)
    },
    [press, release]
  )

  const onKeyFocus = useCallback((id: KeyId): void => setFocusKey(id), [])

  // Legend + accessible name for one token on the current layer.
  const describeToken = (token: KeyToken): { legend: string; name: string } => {
    if (isCharToken(token)) {
      const face = applyShift(engine, token)
      const charName = charNameOf(face)
      return {
        legend: face,
        name:
          charName === null
            ? face
            : translate(`widgets.keyboard.chars.${charName}`),
      }
    }
    if (isFnToken(token)) {
      return {
        legend: token,
        name: translate("widgets.keyboard.fnKeyAria").replace(
          "{n}",
          token.slice(1)
        ),
      }
    }
    return {
      legend: translate(`widgets.keyboard.keys.${token}.legend`),
      name: translate(`widgets.keyboard.keys.${token}.aria`),
    }
  }

  // A hold-tap reads "q, hold for Escape"; inert keys say they do nothing here.
  const describe = (
    binding: Binding
  ): { legend: string; holdLegend: string | null; aria: string } => {
    const tap = describeToken(tapOf(binding))
    const holdToken = holdOf(binding)
    const hold = holdToken === null ? null : describeToken(holdToken)
    const name =
      hold === null
        ? tap.name
        : translate("widgets.keyboard.holdAria")
            .replace("{tap}", tap.name)
            .replace("{hold}", hold.name)
    const inert = isInertBinding(binding) && tapOf(binding) !== NONE
    return {
      aria: inert
        ? translate("widgets.keyboard.inertAria").replace("{label}", name)
        : name,
      holdLegend: hold?.legend ?? null,
      legend: tap.legend,
    }
  }

  const pressedState = (token: KeyToken): boolean | null => {
    switch (token) {
      case "Shift":
        return shiftOn || engine.shiftMode === "caps"
      case "Ctrl":
        return ctrlOn
      case "Lower":
        return isLayerKeyEngaged(engine, "lower")
      case "Raise":
        return isLayerKeyEngaged(engine, "raise")
      case "Adjust":
        return isLayerKeyEngaged(engine, "adjust")
      default:
        return null
    }
  }

  const renderKey = (key: CorneKey): React.JSX.Element => {
    const binding = bindingAt(layer, key)
    const token = tapOf(binding)
    const { legend, holdLegend, aria } = describe(binding)
    return (
      <CorneKeycap
        ariaLabel={aria}
        caps={token === "Shift" && engine.shiftMode === "caps"}
        corneKey={key}
        down={engine.down.has(key.id)}
        holdLegend={holdLegend}
        key={key.id}
        kind={keycapKind(binding)}
        legend={legend}
        lit={lit.has(key.id)}
        onAssistiveClick={onAssistiveClick}
        onFocus={onKeyFocus}
        onKeyDown={onKeyKeyDown}
        onKeyUp={onKeyKeyUp}
        onPointerDown={onKeyPointerDown}
        onPointerEnd={onKeyPointerEnd}
        pressed={pressedState(token)}
        reduceMotion={reduce}
        registerRef={registerRef}
        tabbable={key.id === focusKey}
      />
    )
  }

  if (!mounted) return null

  const glass = GLASS_SURFACE[envSettings.glass]
  const keepCaret = (event: PointerEvent<HTMLElement>): void =>
    event.preventDefault()

  return createPortal(
    <>
      <AnimatePresence>
        {isKeyboardOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className={cn(
              "osk-root pointer-events-none fixed h-fit w-fit",
              dock === "bottom"
                ? "inset-x-0 bottom-0 mx-auto"
                : WIDGET_ANCHOR_CLASS[anchor]
            )}
            data-dock={dock}
            data-frameless={frameless ? "" : undefined}
            data-reduced-motion={reduce ? "" : undefined}
            data-show-ext={showExt ? "" : undefined}
            drag
            dragConstraints={rootBounds.current}
            dragControls={rootDrag}
            dragElastic={0}
            dragListener={false}
            dragMomentum={false}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="corne-keyboard"
            onDrag={onRootDrag}
            onDragEnd={onRootDragEnd}
            ref={rootRef}
            style={{
              x: dock === "float" ? rootX : 0,
              y: dock === "float" ? rootY : 0,
              zIndex: Z_LAYERS.keyboard,
            }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <motion.section
              animate={{ y: 0 }}
              aria-label={translate("widgets.keyboard.region")}
              className="osk-panel"
              exit={{ y: reduce ? 0 : 18 }}
              initial={{ y: reduce ? 0 : 18 }}
              transition={reduce ? { duration: 0 } : SPRING_CONTENT}
            >
              <div
                className={cn("osk-capsule", glass)}
                onPointerDown={keepCaret}
              >
                <button
                  aria-label={translate("widgets.keyboard.move")}
                  className="osk-grip"
                  onKeyDown={nudgeRoot}
                  onPointerDown={startMove}
                  title={translate("widgets.keyboard.move")}
                  type="button"
                >
                  <GripVertical aria-hidden className="size-3.5" />
                </button>
                <span className="osk-title">
                  {translate("widgets.keyboard.heading")}{" "}
                  <small>· {translate("widgets.keyboard.layoutName")}</small>
                </span>
                <fieldset className="osk-tabs">
                  <legend className="sr-only">
                    {translate("widgets.keyboard.layerTabs")}
                  </legend>
                  {LAYER_IDS.map((id) => (
                    <button
                      aria-pressed={layer === id}
                      className="osk-tab"
                      key={id}
                      onClick={() =>
                        dispatch({ layer: id, type: "selectLayer" })
                      }
                      type="button"
                    >
                      {layerLabel(id)}{" "}
                      <small>
                        {translate(`widgets.keyboard.layers.${id}.sub`)}
                      </small>
                    </button>
                  ))}
                </fieldset>
                <button
                  aria-pressed={showExt}
                  className="osk-toggle"
                  onClick={toggleExt}
                  title={translate("widgets.keyboard.extTitle")}
                  type="button"
                >
                  {translate("widgets.keyboard.extToggle")}
                </button>
                <button
                  aria-label={translate("widgets.keyboard.qwertyMapping")}
                  aria-pressed={qwertyMapping}
                  className="osk-icon-btn"
                  onClick={toggleQwertyMapping}
                  title={translate("widgets.keyboard.qwertyMappingHint")}
                  type="button"
                >
                  <Keyboard aria-hidden className="size-3.5" />
                </button>
                <button
                  aria-label={translate("widgets.keyboard.hideFrame")}
                  aria-pressed={frameless}
                  className="osk-icon-btn"
                  onClick={(event) =>
                    frameless ? showFrame() : hideFrame(event.detail === 0)
                  }
                  ref={toggleRef}
                  title={translate("widgets.keyboard.hideFrame")}
                  type="button"
                >
                  <EyeOff aria-hidden className="size-3.5" />
                </button>
                <button
                  aria-label={translate(
                    dock === "bottom"
                      ? "widgets.keyboard.undock"
                      : "widgets.keyboard.dock"
                  )}
                  className="osk-icon-btn"
                  onClick={toggleDock}
                  title={translate(
                    dock === "bottom"
                      ? "widgets.keyboard.undock"
                      : "widgets.keyboard.dock"
                  )}
                  type="button"
                >
                  {dock === "bottom" ? (
                    <PictureInPicture2 aria-hidden className="size-3.5" />
                  ) : (
                    <PanelBottom aria-hidden className="size-3.5" />
                  )}
                </button>
                <button
                  aria-label={translate("widgets.keyboard.close")}
                  className="osk-icon-btn"
                  data-variant="close"
                  onClick={close}
                  title={translate("widgets.keyboard.close")}
                  type="button"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </div>

              <div className="osk-halves">
                {HALVES.map((half) => {
                  const { controls, x, y } = halfMotion[half]
                  return (
                    <motion.div
                      className={cn("osk-slab", glass)}
                      data-dragging={draggingHalf === half ? "" : undefined}
                      drag
                      dragConstraints={halfBounds.current}
                      dragControls={controls}
                      dragElastic={0}
                      dragListener={false}
                      dragMomentum={false}
                      key={half}
                      onDragEnd={() => {
                        setDraggingHalf(null)
                        saveHalves()
                      }}
                      style={{ x, y }}
                    >
                      <button
                        aria-label={translate(
                          `widgets.keyboard.dragHalf.${half}`
                        )}
                        className="osk-half-grip"
                        onDoubleClick={() => resetHalf(half)}
                        onKeyDown={(event) => nudgeHalf(half, event)}
                        onPointerDown={(event) => startHalfDrag(half, event)}
                        title={translate(`widgets.keyboard.dragHalf.${half}`)}
                        type="button"
                      />
                      {half === "L" ? (
                        <button
                          aria-label={translate("widgets.keyboard.showFrame")}
                          className="osk-restore-dot"
                          onClick={showFrame}
                          onPointerDown={keepCaret}
                          ref={dotRef}
                          title={translate("widgets.keyboard.showFrame")}
                          type="button"
                        />
                      ) : null}
                      <fieldset className="osk-half">
                        <legend className="sr-only">
                          {translate(`widgets.keyboard.half.${half}`)}
                        </legend>
                        {CORNE_KEYS.filter((key) => key.half === half).map(
                          renderKey
                        )}
                      </fieldset>
                    </motion.div>
                  )
                })}
              </div>

              <p className="osk-foot">
                <span aria-hidden className="osk-flags">
                  <span
                    className="osk-flag"
                    data-on={layer === "base" ? undefined : ""}
                  >
                    {layerLabel(layer)}
                    {engine.locked === null ? null : (
                      <Lock className="size-2.5" />
                    )}
                  </span>
                  <span
                    className="osk-flag"
                    data-on={
                      shiftOn || engine.shiftMode === "caps" ? "" : undefined
                    }
                  >
                    {translate(
                      engine.shiftMode === "caps"
                        ? "widgets.keyboard.flags.caps"
                        : engine.shiftMode === "oneshot"
                          ? "widgets.keyboard.flags.shiftOneShot"
                          : "widgets.keyboard.flags.shift"
                    )}
                  </span>
                  <span className="osk-flag" data-on={ctrlOn ? "" : undefined}>
                    {translate("widgets.keyboard.flags.ctrl")}
                  </span>
                </span>
              </p>
              <p aria-live="polite" className="sr-only">
                {announcement}
              </p>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {isKeyboardOpen && dockHint ? (
        <div className="osk-dock-hint" style={{ zIndex: Z_LAYERS.keyboard }}>
          {translate("widgets.keyboard.dockHint")}
        </div>
      ) : null}
    </>,
    document.body
  )
}
