"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/niri/login-screen.css"

import { Eye, EyeOff } from "lucide-react"
import { animate, motion, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import type { IconType } from "react-icons"
import {
  SiCplusplus,
  SiElixir,
  SiGo,
  SiHaskell,
  SiJavascript,
  SiKotlin,
  SiLua,
  SiOcaml,
  SiPython,
  SiRust,
  SiSwift,
  SiTypescript,
  SiZig,
} from "react-icons/si"
import avatarSrc from "@/assets/avatar.webp"
import {
  FlameWrap,
  type FlameWrapInstance,
} from "@/components/canvasui/FlameWrap"
import { WallpaperBackground } from "@/components/niri/wallpaper-background"
import { verifyPassword } from "@/lib/auth"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { isCommitEnter } from "@/lib/keyboard-events"
import {
  clearExpiredLock,
  dayPart,
  INITIAL_LOCK,
  LOCKOUT_MS,
  type LockState,
  lockRemainingMs,
  MAX_ATTEMPTS,
  registerFailure,
} from "@/lib/login-lock"
import { person } from "@/lib/person"
import { playSfx } from "@/lib/sfx/play"
import { DEFAULT_THEME, isTheme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

type LangIcon = { Icon: IconType; color: string }

// Each typed character shows as a language-brand glyph in its colour.
const LANG_ICONS: LangIcon[] = [
  { color: "#F7DF1E", Icon: SiJavascript },
  { color: "#3178C6", Icon: SiTypescript },
  { color: "#3776AB", Icon: SiPython },
  { color: "#FF4500", Icon: SiRust },
  { color: "#00ADD8", Icon: SiGo },
  { color: "#00599C", Icon: SiCplusplus },
  { color: "#6E87C4", Icon: SiLua },
  { color: "#F7A41D", Icon: SiZig },
  { color: "#FA7343", Icon: SiSwift },
  { color: "#7F52FF", Icon: SiKotlin },
  { color: "#5D4F85", Icon: SiHaskell },
  { color: "#9B59B6", Icon: SiElixir },
  { color: "#EC6813", Icon: SiOcaml },
]

// FlameWrap colours (shader RGB 0–1). FLAME is the existing purple; DENIED is
// the flare on a wrong password, which then cools back to FLAME.
const FLAME: [number, number, number] = [0.78, 0.365, 1]
const DENIED: [number, number, number] = [1, 0.28, 0.24]
const CARD_INTENSITY = 0.8
const BURN_MS = 2400
const RING_C = 2 * Math.PI * 20 // lockout ring circumference (r = 20)

// Keys that shouldn't wake the lock screen on their own.
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"])

type Phase = "lock" | "card" | "success"

function BlinkingCaret(): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="animate-caret-blink bg-primary h-[1.25em] w-0.5 shrink-0"
    />
  )
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/**
 * The environment lock screen: wallpaper + clock until any key/click wakes it,
 * then the flame card. A wrong password shakes the card and flares the flame
 * red; three in a row lock input for LOCKOUT_MS. The right one (or no stored
 * password) runs the existing flame burn-out, plays a short time-of-day
 * greeting, and hands over to the desktop via `onBurnComplete`.
 */
export function LoginScreen({
  onBurnComplete,
}: {
  onBurnComplete: () => void
}): React.JSX.Element {
  const { locale, translate } = useLocale()
  const { animationPref, envSettings } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const { resolvedTheme } = useTheme()
  const theme = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME

  const [phase, setPhase] = useState<Phase>("lock")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [lock, setLock] = useState<LockState>(INITIAL_LOCK)
  const [deniedKey, setDeniedKey] = useState(0)
  const [deniedActive, setDeniedActive] = useState(false)
  // null until mounted: the page is prerendered, so any time-derived text
  // (clock, date, greeting) must only appear client-side or it won't hydrate.
  const [now, setNow] = useState<number | null>(null)

  const passwordId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const cardFlameRef = useRef<FlameWrapInstance>(null)
  const screenFlameRef = useRef<FlameWrapInstance>(null)
  const greetingRef = useRef<HTMLDivElement>(null)
  const greetingLiveRef = useRef<HTMLParagraphElement>(null)
  const onBurnCompleteRef = useRef(onBurnComplete)
  onBurnCompleteRef.current = onBurnComplete

  const firstName = person.firstName.split(" ")[0] ?? person.firstName
  const greetingText =
    now === null
      ? ""
      : translate(
          `environment.login.greeting.${dayPart(new Date(now).getHours())}`
        ).replace("{name}", firstName)

  // Clock: tick often enough for the minute, and every 250ms while locked
  // out so the countdown ring drains smoothly.
  const locked = now !== null && lockRemainingMs(lock, now) > 0
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(
      () => setNow(Date.now()),
      locked ? 250 : 15_000
    )
    return () => window.clearInterval(id)
  }, [locked])
  useEffect(() => {
    if (lock.lockedUntil !== null && !locked) {
      setLock((s) => clearExpiredLock(s, Date.now()))
      passwordRef.current?.focus()
    }
  }, [lock, locked])

  const wake = useCallback(() => {
    setPhase((p) => (p === "lock" ? "card" : p))
  }, [])

  // Waking: wake sound + focus the (masked) password field once the card rose.
  useEffect(() => {
    if (phase !== "card") return
    playSfx("lock-wake")
    const id = window.setTimeout(
      () => passwordRef.current?.focus({ preventScroll: true }),
      reduced ? 0 : 380
    )
    return () => window.clearTimeout(id)
  }, [phase, reduced])

  const backToLock = useCallback(() => {
    setPassword("")
    setDeniedActive(false)
    setPhase((p) => (p === "card" ? "lock" : p))
  }, [])

  const startBurn = useCallback(() => {
    playSfx("unlock-burn")
    setPhase("success")
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.ctrlKey && e.altKey && e.key === "q") {
        e.preventDefault()
        startBurn()
        return
      }
      if (phase === "lock" && !MODIFIER_KEYS.has(e.key) && !e.metaKey) {
        e.preventDefault()
        wake()
        return
      }
      if (phase === "card" && e.key === "Escape") {
        e.preventDefault()
        backToLock()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, wake, backToLock, startBurn])

  // Short type-on greeting, driven imperatively: a React state change here
  // would re-render the FlameWraps, which re-apply their props every render
  // and would snap the burn back to idle for a frame.
  const playGreeting = useCallback(async (): Promise<void> => {
    const root = greetingRef.current
    if (!root) return
    if (greetingLiveRef.current)
      greetingLiveRef.current.textContent = greetingText
    root.style.opacity = "1"
    if (reduced) {
      await animate(root, { opacity: [0, 1] }, { duration: 0.2 })
    } else {
      const letters = root.querySelectorAll<HTMLElement>("[data-letter]")
      await Promise.all(
        Array.from(letters, (el, i) =>
          animate(
            el,
            {
              filter: ["blur(8px)", "blur(0px)"],
              opacity: [0, 1],
              y: [10, 0],
            },
            { delay: i * 0.008, duration: 0.2, ease: "easeOut" }
          )
        )
      )
    }
    await sleep(160)
    await animate(root, { opacity: 0 }, { duration: 0.3, ease: "easeIn" })
  }, [greetingText, reduced])

  // Success: today's burn-out (card ignites, then the whole screen erupts and
  // dies away), with the greeting played over its final phase.
  useEffect(() => {
    if (phase !== "success") return
    let cancelled = false
    let raf = 0

    if (reduced) {
      // Fades only: greeting + overlay fade, then hand over.
      void (async () => {
        const root = rootRef.current
        await playGreeting()
        if (root) await animate(root, { opacity: 0 }, { duration: 0.3 })
        if (!cancelled) onBurnCompleteRef.current()
      })()
      return () => {
        cancelled = true
      }
    }

    const start = performance.now()
    let greeting: Promise<void> | null = null
    function step(time: number): void {
      const t = clamp01((time - start) / BURN_MS)
      const cardT = easeInOut(clamp01(t / 0.4))
      const ignite = easeInOut(clamp01((t - 0.16) / 0.45))
      const die = easeInOut(clamp01((t - 0.66) / 0.34))

      cardFlameRef.current?.setOptions({
        blaze: cardT,
        distortion: lerp(7, 32, cardT),
        ember: lerp(1.25, 2.5, cardT) * (1 - die),
        intensity: lerp(0.8, 2.2, cardT) * (1 - die),
        melt: lerp(5, 1000, cardT),
        scorch: lerp(1.3, 1.8, cardT),
        smoke: lerp(0.55, 1.9, cardT) * (1 - die),
        sparks: lerp(0.85, 1.7, cardT) * (1 - die),
        spread: lerp(54, 120, cardT),
      })
      screenFlameRef.current?.setOptions({
        blaze: ignite,
        distortion: lerp(10, 36, ignite),
        ember: 2 * (1 - die),
        intensity: lerp(0, 1.8, ignite) * (1 - die),
        melt: lerp(8, 1000, ignite),
        rim: 2.5 * (1 - die),
        scorch: lerp(0, 1.7, ignite),
        smoke: lerp(0, 2, ignite) * (1 - die),
        sparks: lerp(0, 1.6, ignite) * (1 - die),
        spread: lerp(140, 180, ignite),
        turbulence: lerp(0.5, 0.8, ignite),
      })

      if (t >= 0.7 && greeting === null) greeting = playGreeting()
      if (t < 1) {
        raf = requestAnimationFrame(step)
        return
      }
      void (greeting ?? Promise.resolve()).then(() => {
        if (!cancelled) onBurnCompleteRef.current()
      })
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [phase, reduced, playGreeting])

  // Wrong password: the flame flares red, then cools back over ~1.5s. Driven
  // per frame (like the burn) so any re-render is corrected on the next frame.
  const flareDenied = useCallback(() => {
    const start = performance.now()
    function step(time: number): void {
      const k = clamp01((time - start) / 1500)
      const cool = easeInOut(clamp01((k - 0.25) / 0.75))
      cardFlameRef.current?.setOptions({
        color: [
          lerp(DENIED[0], FLAME[0], cool),
          lerp(DENIED[1], FLAME[1], cool),
          lerp(DENIED[2], FLAME[2], cool),
        ],
        intensity: lerp(1.5, CARD_INTENSITY, cool),
      })
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [])

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (loading || phase !== "card" || locked) return
    setLoading(true)
    // Read the live field: a fast type-then-Enter can beat the re-render
    // that would refresh `password` in this closure.
    const ok = await verifyPassword(passwordRef.current?.value ?? password)
    if (ok) {
      setLock(INITIAL_LOCK)
      startBurn()
      return
    }
    const next = registerFailure(lock, Date.now())
    setLock(next)
    setNow(Date.now())
    setPassword("")
    setLoading(false)
    setDeniedActive(true)
    setDeniedKey((k) => k + 1)
    playSfx("denied")
    if (!reduced) {
      flareDenied()
      if (cardRef.current) {
        void animate(
          cardRef.current,
          { x: [0, -11, 11, -9, 9, -4, 4, 0] },
          { duration: 0.62, ease: [0.36, 0.07, 0.19, 0.97] }
        )
      }
    }
  }, [loading, phase, locked, password, lock, reduced, startBurn, flareDenied])
  const submit = useCallback(() => {
    void handleSubmit()
  }, [handleSubmit])

  const onPasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setPassword(e.target.value)
      setDeniedActive(false)
    },
    []
  )
  const onPasswordFocus = useCallback(() => setPasswordFocused(true), [])
  const onPasswordBlur = useCallback(() => setPasswordFocused(false), [])
  const toggleShowPassword = useCallback(() => setShowPassword((p) => !p), [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      setCapsLock(e.getModifierState("CapsLock"))
      if (isCommitEnter(e.nativeEvent)) submit()
    },
    [submit]
  )

  const remaining = now === null ? 0 : lockRemainingMs(lock, now)
  const seconds = Math.ceil(remaining / 1000)
  const status = locked
    ? `${translate("environment.login.locked")} · ${seconds}${translate("environment.login.secondsShort")}`
    : deniedActive && lock.attempts > 0
      ? `${translate("environment.login.denied")} · ${lock.attempts}/${MAX_ATTEMPTS}`
      : ""

  const inputClass =
    "flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground caret-primary"
  const atLock = phase === "lock"
  const timeLabel =
    now === null
      ? ""
      : new Date(now).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        })
  const dateLabel =
    now === null
      ? ""
      : new Date(now).toLocaleDateString(locale, {
          day: "numeric",
          month: "long",
          weekday: "long",
        })

  return (
    <div
      className="fixed inset-0"
      ref={rootRef}
      style={{ zIndex: Z_LAYERS.toast + 50 }}
    >
      {/* Full-screen burn layer: idle at intensity 0, erupts on unlock. Its
          content is the lock screen itself. */}
      <FlameWrap
        color={FLAME}
        distortion={10}
        ember={2}
        height={240}
        intensity={0}
        melt={8}
        radius={0}
        ref={screenFlameRef}
        rim={2.5}
        scale={0.75}
        scorch={0}
        smoke={0}
        sparks={0}
        speed={0.5}
        spread={140}
        style={{ inset: 0, position: "absolute" }}
        turbulence={0.5}
        turbulenceReach={40}
        turbulenceScale={0.5}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          onPointerDown={atLock ? wake : undefined}
        >
          <div
            aria-hidden
            className={cn(
              "absolute -inset-[4%] bg-cover bg-center",
              !reduced && "login-kenburns"
            )}
          >
            {/* The desktop's own wallpaper setting. Client-only (resolved after
                hydration, once the theme is known), like EnvironmentView. */}
            <WallpaperBackground
              className="absolute inset-0"
              id={envSettings.wallpaper}
              theme={theme}
            />
          </div>
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 transition-[backdrop-filter,background-color] duration-700",
              atLock
                ? // Dense enough that the white clock/date/hint clear WCAG AA
                  // over the brightest wallpaper (the light-theme cat photo).
                  "bg-gradient-to-b from-black/60 via-black/45 to-black/70"
                : "bg-black/45 backdrop-blur-2xl backdrop-saturate-110"
            )}
          />
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 text-center text-white [text-shadow:0_2px_30px_rgb(0_0_0/0.5)]",
              "origin-top transition-[top,transform,opacity] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
              atLock ? "top-[22%] scale-100" : "top-[6%] scale-[0.42]",
              phase === "success" && "opacity-0"
            )}
          >
            <div className="text-[clamp(64px,11vw,132px)] leading-none font-extralight tracking-tight tabular-nums">
              {timeLabel}
            </div>
            <div className="mt-2.5 text-[15px] font-medium">{dateLabel}</div>
          </div>
          <p
            className={cn(
              "absolute bottom-[9%] left-1/2 -translate-x-1/2 text-[13px] tracking-[0.08em] text-white transition-opacity [text-shadow:0_1px_12px_rgb(0_0_0/0.6)]",
              atLock ? !reduced && "login-hint" : "opacity-0"
            )}
          >
            {translate("environment.login.pressAnyKey")}
          </p>
        </div>
      </FlameWrap>

      {phase !== "lock" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-[8vh]">
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="pointer-events-auto relative z-10 w-95 max-w-[calc(100vw-32px)]"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 60 }
            }
            ref={cardRef}
            transition={
              reduced
                ? { duration: 0.25 }
                : { damping: 18, stiffness: 220, type: "spring" }
            }
          >
            {/* Flame licking the card's rim */}
            <FlameWrap
              className="w-full"
              color={FLAME}
              distortion={7}
              ember={1.25}
              intensity={CARD_INTENSITY}
              melt={5}
              radius={18}
              ref={cardFlameRef}
              rim={2.15}
              scale={0.85}
              scorch={1.3}
              smoke={0.55}
              sparkSize={1.4}
              sparkSpeed={0.55}
              sparks={0.85}
              speed={0.5}
              spread={54}
              style={{ height: 300 }}
              turbulence={0.34}
              turbulenceReach={28}
              turbulenceScale={0.7}
            >
              <motion.div
                animate={{ opacity: 1, scale: phase === "success" ? 0 : 1 }}
                className={cn(
                  "glass-ink text-foreground flex h-full w-full flex-col justify-center rounded-[18px] border bg-(--glass-fill) px-7 py-6 backdrop-blur-xl",
                  "shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_2px_6px_rgb(0_0_0/0.2),0_40px_80px_-30px_rgb(0_0_0/0.8)]",
                  deniedActive
                    ? "border-destructive/60"
                    : "border-foreground/15"
                )}
                initial={{ opacity: 0 }}
                style={{ transformOrigin: "center" }}
                transition={
                  phase === "success"
                    ? { duration: 0.4, ease: "easeIn" }
                    : { duration: 0.6, ease: "easeOut" }
                }
              >
                <div className="mb-5 flex items-center gap-3">
                  <div
                    aria-hidden
                    className="from-primary/90 to-primary/40 relative size-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br"
                  >
                    <div
                      className="absolute inset-x-1 top-1.5 bottom-0 bg-white/90"
                      style={{
                        mask: `url(${avatarSrc.src}) center bottom / contain no-repeat`,
                        WebkitMask: `url(${avatarSrc.src}) center bottom / contain no-repeat`,
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {person.firstName.split(" ")[0]} {person.lastName}
                    </p>
                    <p className="text-muted-foreground mt-0.5 font-mono text-[11px] tracking-[0.14em] uppercase">
                      {translate("environment.login.locked")}
                    </p>
                  </div>
                </div>

                {locked ? (
                  <div className="border-destructive/35 bg-destructive/10 flex items-center gap-3 rounded-xl border p-3">
                    <svg
                      aria-hidden
                      className="size-12 shrink-0 -rotate-90"
                      viewBox="0 0 48 48"
                    >
                      <circle
                        className="stroke-foreground/15"
                        cx="24"
                        cy="24"
                        fill="none"
                        r="20"
                        strokeWidth="4"
                      />
                      <circle
                        className="stroke-destructive transition-[stroke-dashoffset] duration-200 ease-linear"
                        cx="24"
                        cy="24"
                        fill="none"
                        r="20"
                        strokeDasharray={RING_C}
                        strokeDashoffset={RING_C * (1 - remaining / LOCKOUT_MS)}
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                    </svg>
                    <p className="text-sm">
                      <span className="text-destructive block font-mono text-xl font-semibold tabular-nums">
                        {seconds}
                        {translate("environment.login.secondsShort")}
                      </span>
                      {translate("environment.login.tooManyAttempts")}
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "relative flex h-11 items-center gap-2 rounded-xl border px-3 transition-[border-color,box-shadow,background-color]",
                      deniedActive
                        ? "border-destructive/75 bg-destructive/10"
                        : "border-foreground/15 bg-foreground/5 focus-within:border-primary focus-within:ring-primary/20 focus-within:ring-4"
                    )}
                  >
                    {deniedActive && deniedKey > 0 && !reduced ? (
                      <span
                        aria-hidden
                        className="login-ripple border-destructive pointer-events-none absolute -inset-px rounded-[inherit] border-[1.5px]"
                        key={deniedKey}
                      />
                    ) : null}
                    <label className="sr-only" htmlFor={passwordId}>
                      {translate("environment.login.password")}
                    </label>
                    {showPassword ? (
                      <input
                        autoComplete="current-password"
                        className={inputClass}
                        disabled={loading}
                        id={passwordId}
                        onChange={onPasswordChange}
                        onKeyDown={onKeyDown}
                        placeholder={translate("environment.login.password")}
                        ref={passwordRef}
                        type="text"
                        value={password}
                      />
                    ) : (
                      <div className="relative flex min-h-5 flex-1 items-center gap-1 overflow-hidden">
                        {passwordFocused && password.length === 0 ? (
                          <BlinkingCaret />
                        ) : null}
                        {password.length === 0 ? (
                          <span className="text-muted-foreground font-mono text-sm">
                            {translate("environment.login.password")}
                          </span>
                        ) : (
                          password.split("").map((_, idx) => {
                            const entry = LANG_ICONS[idx % LANG_ICONS.length]
                            if (!entry) return null
                            const { Icon, color } = entry
                            return (
                              <Icon
                                aria-hidden
                                // biome-ignore lint/suspicious/noArrayIndexKey: order is purely positional
                                key={idx}
                                style={{ color, flexShrink: 0, fontSize: 14 }}
                              />
                            )
                          })
                        )}
                        {passwordFocused && password.length > 0 ? (
                          <BlinkingCaret />
                        ) : null}
                        {/* Hidden input captures keystrokes when icons are shown.
                            Pinned to this (relative) field so a click anywhere on
                            the icons focuses it, without its default-width box
                            spilling over — and swallowing clicks on — the eye
                            toggle beside it. */}
                        <input
                          autoComplete="current-password"
                          className="absolute inset-0 size-full opacity-0"
                          disabled={loading}
                          id={passwordId}
                          onBlur={onPasswordBlur}
                          onChange={onPasswordChange}
                          onFocus={onPasswordFocus}
                          onKeyDown={onKeyDown}
                          ref={passwordRef}
                          type="password"
                          value={password}
                        />
                      </div>
                    )}
                    <button
                      aria-label={translate(
                        showPassword
                          ? "environment.login.hidePassword"
                          : "environment.login.showPassword"
                      )}
                      aria-pressed={showPassword}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-primary relative grid size-7 shrink-0 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2"
                      onClick={toggleShowPassword}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                    <button
                      aria-label={translate("environment.login.unlock")}
                      className="bg-primary text-primary-foreground focus-visible:ring-primary relative grid size-8 shrink-0 place-items-center rounded-lg shadow-[0_6px_18px_-6px_var(--primary)] transition-transform outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50"
                      disabled={loading}
                      onClick={submit}
                      type="button"
                    >
                      <svg
                        aria-hidden
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2.4"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="text-muted-foreground mt-2.5 flex min-h-[18px] items-center justify-between text-[11.5px]">
                  <span
                    aria-live="polite"
                    className={cn(
                      "font-mono tracking-[0.06em]",
                      status ? "text-destructive" : "",
                      // The ring already shows the countdown; keep it for
                      // screen readers only.
                      locked && "sr-only"
                    )}
                  >
                    {status}
                  </span>
                  <span
                    className={cn(
                      "text-amber-500 transition-opacity",
                      capsLock ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {translate("environment.login.capsLock")}
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 text-center font-mono text-[0.6rem] tracking-[0.2em] uppercase">
                  {translate("environment.login.forceEntry")}
                </p>
              </motion.div>
            </FlameWrap>
          </motion.div>
        </div>
      ) : null}

      {/* Greeting: played imperatively over the burn-out's final phase. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0"
        ref={greetingRef}
      >
        <p className="text-[clamp(30px,5vw,60px)] font-extralight tracking-tight whitespace-nowrap text-white [text-shadow:0_2px_30px_rgb(0_0_0/0.45)]">
          {Array.from(greetingText, (char, i) => (
            <span
              className="inline-block whitespace-pre opacity-0"
              data-letter
              // biome-ignore lint/suspicious/noArrayIndexKey: characters are positional
              key={i}
            >
              {char}
            </span>
          ))}
        </p>
      </div>
      <p aria-live="polite" className="sr-only" ref={greetingLiveRef} />
    </div>
  )
}
