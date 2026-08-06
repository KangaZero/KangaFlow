"use client"

import { Eye, EyeOff } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
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
import {
  FlameWrap,
  type FlameWrapInstance,
} from "@/components/canvasui/FlameWrap"
import { HexFloat } from "@/components/canvasui/HexFloat"
import { verifyPassword } from "@/lib/auth"
import { Z_LAYERS } from "@/lib/z-order"

type LangIcon = { Icon: IconType; color: string }

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

function Corner({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br"
}): React.JSX.Element {
  const base = "absolute size-4 border-primary"
  const classes: Record<string, string> = {
    bl: "bottom-0 left-0 border-b-2 border-l-2",
    br: "bottom-0 right-0 border-b-2 border-r-2",
    tl: "left-0 top-0 border-l-2 border-t-2",
    tr: "right-0 top-0 border-r-2 border-t-2",
  }
  return <div className={`${base} ${classes[position] ?? ""}`} />
}

function BlinkingCaret(): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="h-[1.25em] w-[2px] shrink-0 animate-caret-blink bg-primary"
    />
  )
}

export function LoginScreen({
  onBurnComplete,
}: {
  onBurnComplete: () => void
}): React.JSX.Element {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [burning, setBurning] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)
  const cardFlameRef = useRef<FlameWrapInstance>(null)
  const screenFlameRef = useRef<FlameWrapInstance>(null)
  const onBurnCompleteRef = useRef(onBurnComplete)
  onBurnCompleteRef.current = onBurnComplete

  const startBurn = useCallback(() => {
    setBurning(true)
  }, [])

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.ctrlKey && e.altKey && e.key === "q") {
        e.preventDefault()
        startBurn()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [startBurn])

  // Drives the login burn-out: the card ignites first, then the whole screen
  // erupts and dies away, revealing the environment behind the overlay.
  useEffect(() => {
    if (!burning) return
    const start = performance.now()
    const DURATION = 2400
    let raf = 0
    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
    const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
    const easeInOut = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

    function step(now: number): void {
      const t = clamp01((now - start) / DURATION)
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
        melt: lerp(8, 360, ignite),
        rim: 2.5 * (1 - die),
        scorch: lerp(0, 1.7, ignite),
        smoke: lerp(0, 2, ignite) * (1 - die),
        sparks: lerp(0, 1.6, ignite) * (1 - die),
        spread: lerp(140, 180, ignite),
        turbulence: lerp(0.5, 0.8, ignite),
      })

      if (t < 1) {
        raf = requestAnimationFrame(step)
      } else {
        onBurnCompleteRef.current()
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [burning])

  async function handleSubmit(): Promise<void> {
    if (loading) return
    setLoading(true)
    setError(null)
    const ok = await verifyPassword(password)
    if (ok) {
      startBurn()
    } else {
      setError("ACCESS DENIED")
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Enter") void handleSubmit()
  }

  const inputClass =
    "flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50 caret-primary"

  return (
    <div className="fixed inset-0" style={{ zIndex: Z_LAYERS.toast + 50 }}>
      {/* Full-screen burn layer — idle at intensity 0, erupts on login */}
      <FlameWrap
        color={[0.78, 0.365, 1]}
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
        {/* Floating hex-tile backdrop */}
        <HexFloat style={{ inset: 0, position: "absolute" }}>
          {/* Dark overlay with scanlines */}
          <div
            className="absolute inset-0 bg-background/85"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
            }}
          />
        </HexFloat>
      </FlameWrap>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative z-10 w-[380px]">
          {/* Burning glow card */}
          <FlameWrap
            className="w-full"
            color={[0.78, 0.365, 1]}
            distortion={7}
            ember={1.25}
            intensity={0.8}
            melt={5}
            radius={12}
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
            style={{ height: 400 }}
            turbulence={0.34}
            turbulenceReach={28}
            turbulenceScale={0.7}
          >
            <div
              className="flex h-full w-full flex-col justify-center rounded-xl border border-primary/30 bg-background/60 px-8 py-10 backdrop-blur-md"
              style={{ boxShadow: "0 0 40px -8px var(--primary)" }}
            >
              <Corner position="tl" />
              <Corner position="tr" />
              <Corner position="bl" />
              <Corner position="br" />

              {/* Title */}
              <div className="mb-8 text-center">
                <h1
                  className="font-bold font-mono text-3xl text-foreground uppercase tracking-[0.25em]"
                  style={{ textShadow: "0 0 20px var(--primary)" }}
                >
                  KANGAFLOW
                </h1>
                <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground uppercase tracking-[0.3em]">
                  SYSTEM ACCESS REQUIRED
                </p>
              </div>

              {/* Username */}
              <div className="mb-4 flex items-center gap-3 border border-border/60 bg-muted/20 px-3 py-2.5">
                <span className="select-none font-mono text-primary text-xs">
                  USER ›
                </span>
                <input
                  autoComplete="username"
                  className={inputClass}
                  disabled={loading}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="identifier"
                  ref={usernameRef}
                  type="text"
                  value={username}
                />
              </div>

              {/* Password */}
              <div className="mb-6 flex items-center gap-3 border border-border/60 bg-muted/20 px-3 py-2.5">
                <span className="select-none font-mono text-primary text-xs">
                  PASS ›
                </span>

                {showPassword ? (
                  <input
                    autoComplete="current-password"
                    className={inputClass}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="access key"
                    type="text"
                    value={password}
                  />
                ) : (
                  <div className="flex min-h-[1.25rem] flex-1 items-center gap-1 overflow-hidden">
                    {passwordFocused && password.length === 0 ? (
                      <BlinkingCaret />
                    ) : null}
                    {password.length === 0 ? (
                      <span className="font-mono text-muted-foreground/50 text-sm">
                        access key
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
                    {/* Hidden input captures keystrokes when icons are shown */}
                    <input
                      autoComplete="current-password"
                      className="absolute opacity-0"
                      disabled={loading}
                      onBlur={() => setPasswordFocused(false)}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onKeyDown={onKeyDown}
                      tabIndex={-1}
                      type="password"
                      value={password}
                    />
                  </div>
                )}

                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={0}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error ? (
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 text-center font-mono text-destructive text-xs tracking-widest"
                    exit={{ opacity: 0, y: -4 }}
                    initial={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* Submit */}
              <button
                className="w-full border border-primary/60 bg-primary/10 py-2.5 font-mono font-semibold text-primary text-sm uppercase tracking-[0.2em] transition-all hover:bg-primary/20 disabled:opacity-40"
                disabled={loading}
                onClick={() => void handleSubmit()}
                style={{
                  boxShadow: "0 0 12px -4px var(--primary)",
                }}
                type="button"
              >
                {loading ? "VERIFYING…" : "AUTHENTICATE"}
              </button>

              {/* Footer hint */}
              <p className="mt-5 text-center font-mono text-[0.6rem] text-muted-foreground/50 uppercase tracking-[0.2em]">
                CTRL + ALT + Q · FORCE ENTRY
              </p>
            </div>
          </FlameWrap>
        </div>
      </div>
    </div>
  )
}
