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
  /** Auto-wire a document mousemove listener to chase the cursor (default true). */
  followMouse?: boolean
  /** Override the DOM element. Defaults to a new <div> appended to <body>. */
  element?: HTMLElement
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
  private readonly ownsElement: boolean

  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private frameCount = 0
  private idleTime = 0
  private idleAnimation: IdleAnimation | null = null
  private idleAnimationFrame = 0
  private lastFrameTimestamp = 0
  private running = false

  constructor(options: OnekoOptions) {
    super()

    if (typeof document === "undefined") {
      throw new Error(
        "Oneko requires a browser DOM; instantiate on the client."
      )
    }

    this.source = options.source
    this.x = options.x ?? 16
    this.y = options.y ?? 16
    this.speed = options.speed ?? 10
    this.size = options.size ?? 32
    this.allowedTargetDistance = options.allowedTargetDistance ?? 48
    this.updateSpeed = options.updateSpeed ?? 100
    this.skipAlertAnimation = options.skipAlertAnimation ?? false
    this.allowedIdleAnimations =
      options.allowedIdleAnimations ?? DEFAULT_IDLE_ANIMATIONS
    this.yawnDuration = options.yawnDuration ?? 8
    this.sleepDuration = options.sleepDuration ?? 192
    this.scratchDuration = options.scratchDuration ?? 9
    this.maxAlertDuration = options.maxAlertDuration ?? 7
    this.targetX = this.x
    this.targetY = this.y

    this.ownsElement = options.element === undefined
    this.element = options.element ?? document.createElement("div")

    // Static styles set once; per-frame draw() only moves left/top.
    this.element.className = "oneko"
    this.element.setAttribute("aria-hidden", "true")
    Object.assign(this.element.style, {
      backgroundImage: `url(${this.source})`,
      backgroundSize: `${this.size * 8}px`,
      height: `${this.size}px`,
      imageRendering: "pixelated",
      pointerEvents: "none",
      position: "fixed",
      width: `${this.size}px`,
      zIndex: "2147483647",
    } satisfies Partial<CSSStyleDeclaration>)

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

    if (options.followMouse ?? true) {
      document.addEventListener("mousemove", this.onMouseMove)
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
    if (this.ownsElement) {
      this.element.remove()
    }
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.setTarget(event.clientX, event.clientY)
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
    this.frameCount += 1
    const diffX = this.x - this.targetX
    const diffY = this.y - this.targetY
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2)

    if (distance < this.speed || distance < this.allowedTargetDistance) {
      this.idle()
      return
    }

    this.resetIdleAnimation()

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
