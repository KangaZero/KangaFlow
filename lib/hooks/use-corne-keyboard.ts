// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// DOM glue around the pure Corne engine (lib/corne-engine): holds the engine
// state, remembers which text field was focused last (the typing target),
// applies the engine's edit actions to it (lib/text-target), drives auto-repeat
// for Backspace / arrows, and mirrors the PHYSICAL keyboard onto the board by
// `KeyboardEvent.code` — lighting keys only, never intercepting real typing.

import { type RefObject, useCallback, useEffect, useRef, useState } from "react"

import {
  activeLayer,
  type EngineEvent,
  type EngineState,
  INITIAL_ENGINE_STATE,
  isInertToken,
  REPEAT_DELAY_MS,
  REPEAT_RATE_MS,
  step,
} from "@/lib/corne-engine"
import {
  isPhysicalShift,
  type KeyId,
  keyById,
  keyForCode,
  tokenAt,
} from "@/lib/corne-layout"
import { applyEditAction, isEditableTarget } from "@/lib/text-target"

export type PressSource = "pointer" | "keyboard" | "assistive"

type Options = {
  isOpen: boolean
  // The widget's own root: focus moving INTO it never changes the target, and
  // physical key events originating inside it are not mirrored.
  rootRef: RefObject<HTMLElement | null>
  // A key did nothing (inert key, or no target) — the widget flashes it.
  onInert: (key: KeyId) => void
}

export type CorneKeyboard = {
  engine: EngineState
  lit: ReadonlySet<KeyId>
  // `at` is the input event's `timeStamp` (same clock as performance.now()):
  // tap-vs-hold must be measured from when the user acted, not from when a
  // busy main thread got round to the handler.
  press: (key: KeyId, source: PressSource, at: number) => void
  release: (key: KeyId, at: number) => void
  dispatch: (event: EngineEvent) => void
  // Move DOM focus back to the typing target (e.g. when the widget closes).
  focusTarget: () => void
}

export function useCorneKeyboard({
  isOpen,
  rootRef,
  onInert,
}: Options): CorneKeyboard {
  const engineRef = useRef<EngineState>(INITIAL_ENGINE_STATE)
  const [engine, setEngine] = useState<EngineState>(INITIAL_ENGINE_STATE)
  const [lit, setLit] = useState<ReadonlySet<KeyId>>(() => new Set())
  const targetRef = useRef<HTMLElement | null>(null)
  const repeatRef = useRef<{ delay: number; interval: number }>({
    delay: 0,
    interval: 0,
  })
  const onInertRef = useRef(onInert)
  onInertRef.current = onInert

  const stopRepeat = useCallback((): void => {
    window.clearTimeout(repeatRef.current.delay)
    window.clearInterval(repeatRef.current.interval)
  }, [])

  // One engine transition: advance state, then perform its edits on the
  // target. Reports whether it produced edits and whether any of them landed.
  const run = useCallback(
    (
      event: EngineEvent
    ): { acted: boolean; edited: boolean; repeat: boolean } => {
      const result = step(engineRef.current, event)
      engineRef.current = result.state
      setEngine(result.state)
      const target = targetRef.current
      let edited = false
      for (const action of result.actions) {
        if (target?.isConnected && applyEditAction(target, action))
          edited = true
      }
      return {
        acted: result.actions.length > 0,
        edited,
        repeat: result.repeat && edited,
      }
    },
    []
  )

  const dispatch = useCallback(
    (event: EngineEvent): void => {
      run(event)
    },
    [run]
  )

  const press = useCallback(
    (key: KeyId, source: PressSource, at: number): void => {
      const target = targetRef.current
      // Pointer presses keep focus where it is (pointerdown is prevented); if a
      // keyboard user tabbed into the keys first, hand focus back to the field.
      if (
        source === "pointer" &&
        target?.isConnected &&
        document.activeElement !== target
      ) {
        target.focus({ preventScroll: true })
      }
      const corneKey = keyById(key)
      const token =
        corneKey === undefined
          ? null
          : tokenAt(activeLayer(engineRef.current), corneKey)
      const { acted, edited, repeat } = run({
        at,
        key,
        type: "press",
      })
      // Flash keys that did nothing: inert keys (Gui/Alt/F-keys/NOOP), and edits
      // with no target or that the target could not take (Enter in a search
      // box without a handler, …). Modifiers only change state, so they never do.
      if (token === null || isInertToken(token) || (acted && !edited)) {
        onInertRef.current(key)
      }
      if (!repeat) return
      stopRepeat()
      repeatRef.current.delay = window.setTimeout(() => {
        repeatRef.current.interval = window.setInterval(
          () => run({ key, type: "repeat" }),
          REPEAT_RATE_MS
        )
      }, REPEAT_DELAY_MS)
    },
    [run, stopRepeat]
  )

  const release = useCallback(
    (key: KeyId, at: number): void => {
      stopRepeat()
      run({ at, key, type: "release" })
    },
    [run, stopRepeat]
  )

  const focusTarget = useCallback((): void => {
    const target = targetRef.current
    if (target?.isConnected) target.focus({ preventScroll: true })
  }, [])

  // Remember the last focused text field outside the widget. Seeded from the
  // current focus on open, so "focus the notes, open the keyboard" just works.
  useEffect(() => {
    if (!isOpen) return
    const seed = document.activeElement
    if (isEditableTarget(seed) && !rootRef.current?.contains(seed)) {
      targetRef.current = seed
    }
    const onFocusIn = (event: FocusEvent): void => {
      const el = event.target
      if (!(el instanceof Element) || rootRef.current?.contains(el)) return
      if (isEditableTarget(el)) targetRef.current = el
    }
    document.addEventListener("focusin", onFocusIn)
    return () => document.removeEventListener("focusin", onFocusIn)
  }, [isOpen, rootRef])

  // Physical mirroring: light the Corne key at the pressed key's position.
  // Listeners are passive observers — nothing is prevented or re-dispatched.
  useEffect(() => {
    if (!isOpen) return
    const fromWidget = (event: KeyboardEvent): boolean =>
      event.target instanceof Node &&
      (rootRef.current?.contains(event.target) ?? false)
    const setKey = (code: string, on: boolean): void => {
      const id = keyForCode(code)
      if (id !== null) {
        setLit((prev) => {
          if (prev.has(id) === on) return prev
          const next = new Set(prev)
          if (on) next.add(id)
          else next.delete(id)
          return next
        })
      }
      if (isPhysicalShift(code)) run({ down: on, type: "physicalShift" })
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.isTrusted || event.repeat || fromWidget(event)) return
      setKey(event.code, true)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      if (!event.isTrusted) return
      setKey(event.code, false)
    }
    const clear = (): void => {
      setLit(new Set())
      run({ down: false, type: "physicalShift" })
    }
    window.addEventListener("keydown", onKeyDown, { passive: true })
    window.addEventListener("keyup", onKeyUp, { passive: true })
    window.addEventListener("blur", clear)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", clear)
      clear()
    }
  }, [isOpen, rootRef, run])

  // Closing drops held keys and transient modifiers (a lock / caps survive).
  useEffect(() => {
    if (isOpen) return
    stopRepeat()
    run({ type: "reset" })
  }, [isOpen, run, stopRepeat])

  useEffect(() => stopRepeat, [stopRepeat])

  return { dispatch, engine, focusTarget, lit, press, release }
}
