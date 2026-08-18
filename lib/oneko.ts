// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Framework-agnostic port of oneko.js: a pixel cat that chases the cursor.
// No React, no framework — a plain class over the DOM, so any app (or none) can
// `new Oneko({ source })`. Respects prefers-reduced-motion.
//   Original:  https://github.com/adryd325/oneko.js
//   Ported from the lots-o-nekos fork: https://github.com/raynepaws/lots-o-nekos
//
// The sprite sheet is an 8x4 grid of `size`-px tiles (256x128 at size 32). Each
// cell is a [col, row] pair as NEGATIVE multiples of `size`, matching CSS
// background-position (which shifts the image up/left to reveal a tile).
// Multi-frame animations cycle through their cell array.
import onekoSrc from "@/assets/oneko/default.png"

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"

export type IdleAnimation =
  | "sleeping"
  | "scratchSelf"
  | "scratchWallN"
  | "scratchWallE"
  | "scratchWallS"
  | "scratchWallW"

export type SpriteName = Direction | IdleAnimation | "idle" | "alert" | "tired"

type Cell = readonly [col: number, row: number]

const SPRITE_SETS: Record<SpriteName, readonly Cell[]> = {
  alert: [[-7, -3]],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  idle: [[-3, -3]],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  tired: [[-3, -2]],
  W: [
    [-4, -2],
    [-4, -3],
  ],
}

const DEFAULT_IDLE_ANIMATIONS: readonly IdleAnimation[] = [
  "sleeping",
  "scratchSelf",
  "scratchWallN",
  "scratchWallE",
  "scratchWallS",
  "scratchWallW",
]

//NOTE: Other DEFAULT settings at /components/niri/settings.ts, but oneko settings can only be configured via the terminal only
// element is intentionally excluded: the constructor creates its own <div> when
// the caller doesn't supply one, so this constant is safe to import SSR-side.
// x/y default to 16 (a static fallback); callers that need the viewport centre
// pass explicit values (see components/neko.tsx).
export const DEFAULT_ONEKO_OPTIONS: Omit<Required<OnekoOptions>, "element"> = {
  allowedIdleAnimations: DEFAULT_IDLE_ANIMATIONS,
  allowedTargetDistance: 48,
  anchorName: "--oneko",
  clickAlertDuration: 1000, //ms
  followMouse: false,
  isToggledOn: true,
  maxAlertDuration: 4,
  scratchDuration: 5,
  size: 32,
  skipAlertAnimation: true,
  sleepDuration: 30,
  source: onekoSrc.src,
  speechChance: 0.5,
  speechClassName: "oneko-speech",
  speechMessages: [], //Set at /components/neko.tsx as it needs `useLocale` provider
  speed: 10,
  updateSpeed: 100,
  x: window.innerWidth / 2,
  y: window.innerHeight / 2 - 200,
  yawnDuration: 8,
} as const

export interface OnekoOptions {
  /** URL of the sprite-sheet PNG (8x4 grid of `size`px tiles). Required. */
  source: string
  /** Start position, in px (window coords). Defaults to (16, 16). */
  x?: number
  y?: number
  /** Px moved per update tick. */
  speed?: number
  /** Tile size in px (also the on-screen cat size). */
  size?: number
  /** Cat idles once within this many px of the target. */
  allowedTargetDistance?: number
  /** Min ms between frames. */
  updateSpeed?: number
  /** Skip the "!" alert pause before the cat starts chasing. */
  skipAlertAnimation?: boolean
  /** Which idle animations are eligible. */
  allowedIdleAnimations?: readonly IdleAnimation[]
  yawnDuration?: number
  sleepDuration?: number
  scratchDuration?: number
  maxAlertDuration?: number
  /** How long (ms) a click holds the "!" alert pose before resuming. */
  clickAlertDuration?: number
  /** Messages the cat may "say" while idling (not sleeping). Empty disables it. */
  speechMessages?: readonly string[]
  /** Chance (0–1) of a speech bubble each time the cat starts idling. Default 1/3. */
  speechChance?: number
  /** Class on the speech-bubble popover (style it in your CSS). Default "oneko-speech". */
  speechClassName?: string
  /** anchor-name set on the cat element for CSS anchor positioning. Default "--oneko". */
  anchorName?: string
  /** Auto-wire a document mousemove listener to chase the cursor (default true). */
  followMouse?: boolean
  /** Override the DOM element. Defaults to a new <div> appended to <body>. */
  element?: HTMLElement
  /** the oneko toggle cmd */
  isToggledOn?: boolean
}

/** Dispatched on the instance (it is an EventTarget): "draw" | "startRunning" | "stopRunning". */
export type OnekoEventType = "draw" | "startRunning" | "stopRunning"

// Pure geometry: which of the 8 compass sprites faces from the cat toward the
// target, given the signed offsets and their distance. Extracted as a free
// function so it is unit-testable without a DOM.
export function resolveDirection(
  diffX: number,
  diffY: number,
  distance: number
): Direction {
  // Normalize each offset to [-1, 1]; sign convention (from frame()): positive
  // diffX = target is West, positive diffY = target is North.
  const nx = diffX / distance
  const ny = diffY / distance
  const west = nx > 0.5
  const east = nx < -0.5

  // Branching to literals (rather than concatenating strings) keeps the result
  // typed as `Direction` — never the empty string. The invariant nx² + ny² = 1
  // means |ny| ≤ 0.5 forces |nx| > 0.5, so the vertical-neutral fall-through
  // below is always genuinely horizontal.
  if (ny > 0.5) {
    return west ? "NW" : east ? "NE" : "N"
  }
  if (ny < -0.5) {
    return west ? "SW" : east ? "SE" : "S"
  }
  return west ? "W" : "E"
}

export class Oneko extends EventTarget {
  readonly element: HTMLElement
  private readonly source: string
  private readonly speed: number
  private readonly size: number
  private readonly allowedTargetDistance: number
  private readonly updateSpeed: number
  private readonly skipAlertAnimation: boolean
  private readonly allowedIdleAnimations: readonly IdleAnimation[]
  private readonly yawnDuration: number
  private readonly sleepDuration: number
  private readonly scratchDuration: number
  private readonly maxAlertDuration: number
  private readonly clickAlertDuration: number
  private readonly speechMessages: readonly string[]
  private readonly speechChance: number
  private readonly speechEl: HTMLElement | null = null
  // True when the browser lacks CSS anchor positioning (older Firefox < 147 /
  // Safari < 26); we then position the bubble by hand instead of via
  // position-area. A no-op on browsers that support it (the vast majority now).
  private readonly anchorFallback: boolean
  private readonly ownsElement: boolean
  private readonly isToggledOn: boolean

  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private frameCount = 0
  private idleTime = 0
  private idleAnimation: IdleAnimation | null = null
  private idleAnimationFrame = 0
  private lastFrameTimestamp = 0
  private alertUntil = 0
  private speechOpen = false
  private speechRolled = false
  private running = false
  private dragging = false
  private stopRandomMoving = false

  constructor(rawOptions: Partial<OnekoOptions> = {}) {
    super()

    if (typeof document === "undefined") {
      throw new Error(
        "Oneko requires a browser DOM; instantiate on the client."
      )
    }

    // Capture before merge so we know if the caller supplied their own element.
    const ownsElement = rawOptions.element === undefined
    const options: Required<OnekoOptions> = {
      ...DEFAULT_ONEKO_OPTIONS,
      ...rawOptions,
      // element must be an HTMLElement; supply a new <div> when caller omits it.
      // Placed after the spread so an explicit rawOptions.element still wins.
      element: rawOptions.element ?? document.createElement("div"),
    }

    this.source = options.source
    this.x = options.x
    this.y = options.y
    this.speed = options.speed
    this.size = options.size
    this.allowedTargetDistance = options.allowedTargetDistance
    this.updateSpeed = options.updateSpeed
    this.skipAlertAnimation = options.skipAlertAnimation
    this.allowedIdleAnimations = options.allowedIdleAnimations
    this.yawnDuration = options.yawnDuration
    this.sleepDuration = options.sleepDuration
    this.scratchDuration = options.scratchDuration
    this.maxAlertDuration = options.maxAlertDuration
    this.clickAlertDuration = options.clickAlertDuration
    this.speechMessages = options.speechMessages
    this.speechChance = options.speechChance
    this.anchorFallback = !CSS.supports("position-area", "top")
    this.targetX = this.x
    this.targetY = this.y

    this.isToggledOn = options.isToggledOn

    const anchorName = options.anchorName
    const speechClassName = options.speechClassName

    this.ownsElement = ownsElement
    this.element = options.element

    //TODO: Add "Psychopath" achievement as well but at oneko cmd (terminal body switch case)
    if (!this.isToggledOn) {
      console.warn("How could you!")
      return
    }

    // Static styles set once; per-frame draw() only moves left/top.
    this.element.className = "oneko"
    this.element.setAttribute("aria-hidden", "true")
    this.element.addEventListener("click", this.onClick)
    this.element.addEventListener("pointerdown", this.onPointerDown)
    this.element.addEventListener("pointermove", this.onPointerMove)
    this.element.addEventListener("pointerup", this.onPointerUp)

    Object.assign(this.element.style, {
      backgroundImage: `url(${this.source})`,
      backgroundSize: `${this.size * 8}px`,
      height: `${this.size}px`,
      imageRendering: "pixelated",
      // "auto" (not "none") so the cat can receive its click handler; the
      // tradeoff is that it intercepts clicks over whatever sits beneath it.
      pointerEvents: "auto",
      position: "fixed",
      width: `${this.size}px`,
      zIndex: "2147483647",
    } satisfies Partial<CSSStyleDeclaration>)
    // Name the cat as a CSS anchor so the speech bubble can peg itself to it
    // via position-anchor / position-area (no JS position math).
    this.element.style.setProperty("anchor-name", anchorName)

    // The speech bubble is a top-layer popover (escapes z-index/overflow). Built
    // only when messages exist and the browser supports the Popover API.
    this.speechEl = this.createSpeechElement(speechClassName)

    if (this.ownsElement) {
      document.body.appendChild(this.element)
    }
    this.draw()

    // Respect the user's motion preference: build the element but never animate.
    if (!Oneko.canInitialize()) {
      console.warn(
        "prefers-reduced-motion is set to reduce — Oneko will stay still."
      )
      return
    }

    if (options.followMouse) {
      document.addEventListener("mousemove", this.onMouseMove)
    } else {
      this.onRandomlyMove()
    }
    this.running = true
    window.requestAnimationFrame(this.onAnimationFrame)
  }

  static canInitialize(): boolean {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  setTarget(x: number, y: number): this {
    this.targetX = x
    this.targetY = y
    return this
  }

  setPosition(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  moveTo(x: number, y: number): this {
    this.targetX = x
    this.targetY = y
    this.x = x
    this.y = y
    return this
  }

  /** Stop the loop, drop listeners, and remove the element if we created it. */
  destroy(): void {
    this.running = false
    document.removeEventListener("mousemove", this.onMouseMove)
    this.element.removeEventListener("click", this.onClick)
    this.element.removeEventListener("pointerdown", this.onPointerDown)
    this.element.removeEventListener("pointermove", this.onPointerMove)
    this.element.removeEventListener("pointerup", this.onPointerUp)
    this.hideSpeech()
    this.speechEl?.remove()
    if (this.ownsElement) {
      this.element.remove()
    }
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (event.y === 0) {
      this.setTarget(this.x, this.y)
      return
    } //Stop following the Mouse, as it is currently out of bounds
    this.setTarget(event.clientX, event.clientY)
  }

  private readonly onRandomlyMove = async (): Promise<void> => {
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms))

    const intervals = Array.from({ length: 100 }, () => randInt(1, 20))
    let current = 0

    while (!this.stopRandomMoving) {
      const maxX = document.documentElement.clientWidth
      const maxY = document.documentElement.clientHeight
      const xs = randInt(1, maxX)
      const ys = randInt(1, maxY)

      this.setTarget(xs, ys)
      await this.waitUntilArrived(xs, ys)
      await sleep((intervals[current] ?? 1) * 1000)

      current = (current + 1) % intervals.length
    }
  }

  private waitUntilArrived(
    tx: number,
    ty: number,
    epsilon = 0.5,
    timeout = 5000
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now()
      const check = () => {
        const done =
          Math.abs(this.x - tx) < epsilon && Math.abs(this.y - ty) < epsilon
        if (
          done ||
          this.stopRandomMoving ||
          performance.now() - start > timeout
        ) {
          resolve()
        } else {
          requestAnimationFrame(check)
        }
      }
      requestAnimationFrame(check)
    })
  }

  private readonly onClick = (): void => {
    // Hold the alert pose until this deadline; frame() enforces the freeze.
    // performance.now() shares the clock with requestAnimationFrame timestamps.
    this.alertUntil = performance.now() + this.clickAlertDuration
    this.setSprite("alert", 0)
    this.draw()
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.dragging = true
    this.element.setPointerCapture(e.pointerId)
    this.setSprite("alert", 0)
    this.draw()
    this.stopRandomMoving = true
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    this.setPosition(e.x, e.y)
    this.setSprite("scratchWallS", 0)
    this.draw()
  }

  private readonly onPointerUp = (e: PointerEvent): void => {
    this.dragging = false
    this.element.releasePointerCapture(e.pointerId)
    this.setSprite("scratchSelf", 0)
    this.draw()
    this.stopRandomMoving = false
  }

  private createSpeechElement(className: string): HTMLElement | null {
    const supportsPopover = "popover" in HTMLElement.prototype
    if (this.speechMessages.length === 0 || !supportsPopover) {
      return null
    }
    const el = document.createElement("div")
    el.className = className
    el.setAttribute("popover", "manual") // programmatic show/hide, no light dismiss
    el.setAttribute("aria-hidden", "true")
    el.style.scrollbarWidth = "none"
    document.body.appendChild(el)
    return el
  }

  private showSpeech(): void {
    const el = this.speechEl
    if (!el || this.speechOpen || this.speechMessages.length === 0) {
      return
    }
    const message =
      this.speechMessages[
        Math.floor(Math.random() * this.speechMessages.length)
      ]
    if (message === undefined) {
      return
    }
    el.textContent = message
    el.showPopover()
    this.speechOpen = true
    this.positionSpeech()
  }

  private hideSpeech(): void {
    if (!this.speechEl || !this.speechOpen) {
      return
    }
    this.speechEl.hidePopover()
    this.speechOpen = false
  }

  // Fallback for browsers without CSS anchor positioning: peg the bubble above
  // the cat by hand (centre-aligned, minus a gap). No-op where position-area
  // works, so modern Firefox/Chromium/Safari never hit this.
  private positionSpeech(): void {
    const el = this.speechEl
    if (!el || !this.speechOpen || !this.anchorFallback) {
      return
    }
    const gap = 8
    const rect = el.getBoundingClientRect()
    const left = this.x - rect.width / 2
    const top = this.y - this.size / 2 - gap - rect.height
    el.style.left = `${Math.max(0, left)}px`
    el.style.top = `${Math.max(0, top)}px`
  }

  private readonly onAnimationFrame = (timestamp: number): void => {
    if (!this.running || !this.element.isConnected) {
      return
    }
    if (!this.lastFrameTimestamp) {
      this.lastFrameTimestamp = timestamp
    }
    if (timestamp - this.lastFrameTimestamp > this.updateSpeed) {
      this.lastFrameTimestamp = timestamp
      this.frame()
    }
    window.requestAnimationFrame(this.onAnimationFrame)
  }

  private setSprite(name: SpriteName, frame: number): void {
    const set = SPRITE_SETS[name]
    const cell = set[frame % set.length]
    if (!cell) {
      return
    }
    this.element.style.backgroundPosition = `${cell[0] * this.size}px ${cell[1] * this.size}px`
  }

  private resetIdleAnimation(): void {
    this.idleAnimation = null
    this.idleAnimationFrame = 0
  }

  private idle(): void {
    if (this.idleTime === 1) {
      this.dispatchEvent(new Event("stopRunning"))
    }
    this.idleTime += 1

    // Once per idle session (reset on movement), roll a 1-in-N chance to speak.
    // Skipped if already asleep — a sleeping cat stays quiet.
    if (!this.speechRolled && this.idleAnimation !== "sleeping") {
      this.speechRolled = true
      if (Math.random() < this.speechChance) {
        this.showSpeech()
      }
    }

    // Roughly every 20s of idling, roll for a new idle animation.
    if (
      this.idleTime > 10 &&
      Math.floor(Math.random() * 200) === 0 &&
      this.idleAnimation === null &&
      this.allowedIdleAnimations.length > 0
    ) {
      const available: IdleAnimation[] = []
      const allow = (a: IdleAnimation): boolean =>
        this.allowedIdleAnimations.includes(a)
      if (allow("sleeping")) available.push("sleeping")
      if (allow("scratchSelf")) available.push("scratchSelf")
      if (this.x < this.size && allow("scratchWallW"))
        available.push("scratchWallW")
      if (this.y < this.size && allow("scratchWallN"))
        available.push("scratchWallN")
      if (this.x > window.innerWidth - this.size && allow("scratchWallE"))
        available.push("scratchWallE")
      if (this.y > window.innerHeight - this.size && allow("scratchWallS"))
        available.push("scratchWallS")
      this.idleAnimation =
        available[Math.floor(Math.random() * available.length)] ?? null
    }

    const anim = this.idleAnimation
    switch (anim) {
      case "sleeping":
        // Falling asleep dismisses any bubble — sleeping cats don't talk.
        this.hideSpeech()
        if (this.idleAnimationFrame < this.yawnDuration) {
          this.setSprite("tired", 0)
          break
        }
        this.setSprite("sleeping", Math.floor(this.idleAnimationFrame / 4))
        if (this.idleAnimationFrame > this.sleepDuration) {
          this.resetIdleAnimation()
        }
        break
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        this.setSprite(anim, this.idleAnimationFrame)
        if (this.idleAnimationFrame > this.scratchDuration) {
          this.resetIdleAnimation()
        }
        break
      default:
        this.setSprite("idle", 0)
        this.draw()
        return
    }
    this.idleAnimationFrame += 1
    this.draw()
  }

  private frame(): void {
    if (this.dragging) {
      return
    }
    // Clicked recently: hold the "!" pose and stay put until the deadline.
    if (performance.now() < this.alertUntil) {
      this.setSprite("alert", 0)
      this.draw()
      return
    }

    this.frameCount += 1
    const diffX = this.x - this.targetX
    const diffY = this.y - this.targetY
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2)

    if (distance < this.speed || distance < this.allowedTargetDistance) {
      this.idle()
      return
    }

    this.resetIdleAnimation()
    // Left idle → drop any bubble and re-arm the roll for the next idle session.
    this.speechRolled = false
    this.hideSpeech()

    if (this.skipAlertAnimation) {
      if (this.idleTime > 1) {
        this.idleTime = 1
        this.dispatchEvent(new Event("startRunning"))
      }
    } else if (this.idleTime > 1) {
      this.setSprite("alert", 0)
      // Count down (capped) before bolting after the target.
      this.idleTime = Math.min(this.idleTime, this.maxAlertDuration)
      this.idleTime -= 1
      if (this.idleTime === 1) {
        this.dispatchEvent(new Event("startRunning"))
      }
      this.draw()
      return
    }

    this.setSprite(resolveDirection(diffX, diffY, distance), this.frameCount)

    this.x -= (diffX / distance) * this.speed
    this.y -= (diffY / distance) * this.speed
    this.x = Math.min(
      Math.max(this.size / 2, this.x),
      window.innerWidth - this.size / 2
    )
    this.y = Math.min(
      Math.max(this.size / 2, this.y),
      window.innerHeight - this.size / 2
    )

    this.draw()
  }

  private draw(): void {
    this.element.style.left = `${this.x - this.size / 2}px`
    this.element.style.top = `${this.y - this.size / 2}px`
    this.dispatchEvent(new Event("draw"))
  }
}
