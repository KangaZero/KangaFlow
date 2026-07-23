/** biome-ignore-all lint/suspicious/noArrayIndexKey: <Needed to avoid duplicates> */
"use client"

import { motion, type Transition } from "motion/react"
import { useId, useRef, useState } from "react"
import {
  INTRO_BRAND,
  INTRO_JA_WELCOME,
  type IntroStroke,
} from "@/components/ui/apple-hello-paths"
import { cn } from "@/lib/utils"

const initialProps = {
  opacity: 0,
  pathLength: 0,
} as const

const animateProps = {
  opacity: 1,
  pathLength: 1,
} as const

type Props = React.ComponentProps<typeof motion.svg> & {
  speed?: number
  onAnimationComplete?: () => void
  forceVisibleAlways?: boolean
}

// Monoline stroke paths (in writing order) for こ ん に ち は, one inner array
// per glyph. Each glyph is drawn on a 109×109 canvas.
// Source: KanjiVG — github.com/KanjiVG/kanjivg (CC BY-SA 3.0).
const KONNICHIWA_STROKES: readonly (readonly string[])[] = [
  // こ
  [
    "M34.75,26.75c1.12,0.88,2.91,2.01,6,1.5c7.62-1.25,14.11-2.56,22.38-2.62c15.5-0.12,5.88,5-5.75,9",
    "M30,68.12c2.25,14.5,15.26,17.96,31,16.75c6.5-0.5,11.88-1.25,17.62-2.88",
  ],
  // ん
  [
    "M56.35,16.5c0.75,1.75,1.13,5.83-0.38,8.25c-7,11.25-27.22,43.47-33.88,54.37c-9,14.75-7.62,16.25,1.5,1.25c17.86-29.36,32-23.76,32-6.75c0,25,19,26.5,34.25-5",
  ],
  // に
  [
    "M24.53,22.75c1.25,1.5,1.62,3.75,1.12,6.38c-3,15.88-9,32.5-7.38,47.62c2.02,18.84,4.5,5.75,8.5-3.5",
    "M53.2,30.64c0.96,0.79,2.44,1.58,5.1,1.35c6.98-0.61,15.01-3.3,22.04-3.36c13.19-0.11,1.5,3.75-8.39,7.35",
    "M52.53,68c1.76,12.92,11.92,16.01,24.23,14.93c5.08-0.45,8.9-0.8,14.27-2.06",
  ],
  // ち
  [
    "M24.5,32.62c1.38,0.62,3.88,1.51,6.38,1.12c6.5-1,18.25-4.12,26.88-6c2.64-0.57,5.38-1.5,7.62-2.38",
    "M45.62,15.62c0.75,1.25,0.71,3.58,0.38,5.25c-3,15-4.25,22.59-8.38,38.62c-3.25,12.62-5.38,11.12,3.62,4.38c8.29-6.21,19.75-9.5,28.5-9.5c8.62,0,14.58,5.88,14.5,14.5c-0.12,13.5-16.5,20.62-29.88,23.25",
  ],
  // は
  [
    "M24.51,18c1.25,1.5,2.15,4,1.62,6.62c-3.5,17.62-6.98,36.4-4,54.88c2.5,15.5,1.12,2,5.62-6.25",
    "M49.64,37.89c2.41,1.57,4.85,2.16,7.8,1.71c9.36-1.43,17.46-2.94,23.4-4.57c3.12-0.86,5.96-1.29,7.8-1.29",
    "M69.77,16.5c2.25,2.12,2.88,4.12,2.88,6.5c0,2.38,1.5,38.62,1.5,48c0,22.5-30.62,19.62-30.62,10.5c0-9.75,23.88-5.62,29.5-2.88c5.62,2.74,11.98,8.26,13.36,9.38",
  ],
]

const GLYPH_SIZE = 109

// Flatten glyphs → strokes once, tagging each stroke with its vertical glyph
// offset (tategaki — 縦書き, stacked top-to-bottom) and its global draw index
// (used for the cascade + last-stroke hook).
const JAPANESE_STROKES = KONNICHIWA_STROKES.flatMap((glyph, glyphIndex) =>
  glyph.map((d) => ({ d, y: glyphIndex * GLYPH_SIZE }))
).map((stroke, index, all) => ({
  ...stroke,
  index,
  isLast: index === all.length - 1,
}))

// Each stroke draws itself, then the next begins — a pen cascading across the
// word. Given a stroke's position in the draw order, decide WHEN it starts and
// HOW LONG it takes. `speed` scales the whole animation (it multiplies timing,
// matching the English variant's convention: larger = slower/longer).
function strokeTransition(index: number, speed: number): Transition {
  const calc = (x: number) => x * speed
  const delay = calc(index * 0.35)
  return {
    delay,
    duration: calc(0.45),
    ease: "easeInOut",
    opacity: { delay, duration: 0.15 },
  }
}

// Seconds the finished lettering lingers on screen before it fades out.
const HOLD_SECONDS = 3

// Shared completion wiring for both effects: flips `done` once the final stroke
// has drawn (driving a state-based fade-out) and forwards the caller's optional
// callback. Returns a [done, handler] tuple so each component stays DRY.
function useHelloEffectComplete(onAnimationComplete?: () => void) {
  const [done, setDone] = useState(false)
  const handleComplete = () => {
    setDone(true)
    onAnimationComplete?.()
  }
  return [done, handleComplete] as const
}

function AppleHelloJapaneseEffect({
  className,
  speed = 1,
  onAnimationComplete,
  forceVisibleAlways,
  ...props
}: Props) {
  const [done, handleComplete] = useHelloEffectComplete(onAnimationComplete)

  return (
    <motion.svg
      animate={{ opacity: forceVisibleAlways ? 1 : done ? 0 : 1 }}
      className={cn("h-auto w-20", className)}
      exit={{ opacity: 0 }}
      fill="none"
      initial={{ opacity: 1 }}
      stroke="currentColor"
      strokeWidth="5.5"
      transition={{ delay: done ? HOLD_SECONDS : 0, duration: 0.6 }}
      viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE * KONNICHIWA_STROKES.length}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>こんにちは</title>

      {JAPANESE_STROKES.map(({ d, y, index, isLast }) => (
        <g key={d} transform={`translate(0 ${y})`}>
          <motion.path
            animate={animateProps}
            d={d}
            initial={initialProps}
            style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
            transition={strokeTransition(index, speed)}
            {...(isLast ? { onAnimationComplete: handleComplete } : {})}
          />
        </g>
      ))}
    </motion.svg>
  )
}

function AppleHelloEnglishEffect({
  className,
  speed = 1,
  onAnimationComplete,
  forceVisibleAlways,
  ...props
}: Props) {
  const calc = (x: number) => x * speed
  const [done, handleComplete] = useHelloEffectComplete(onAnimationComplete)

  return (
    <motion.svg
      animate={{ opacity: forceVisibleAlways ? 1 : done ? 0 : 1 }}
      className={cn("h-20", className)}
      exit={{ opacity: 0 }}
      fill="none"
      initial={{ opacity: 1 }}
      stroke="currentColor"
      strokeWidth="14.8883"
      transition={{ delay: done ? HOLD_SECONDS : 0, duration: 0.6 }}
      viewBox="0 0 638 200"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>hello</title>

      {/* h1 */}
      <motion.path
        animate={animateProps}
        d="M8.69214 166.553C36.2393 151.239 61.3409 131.548 89.8191 98.0295C109.203 75.1488 119.625 49.0228 120.122 31.0026C120.37 17.6036 113.836 7.43883 101.759 7.43883C88.3598 7.43883 79.9231 17.6036 74.7122 40.9363C69.005 66.5793 64.7866 96.0036 54.1166 190.356"
        initial={initialProps}
        style={{ strokeLinecap: "round" }}
        transition={{
          duration: calc(0.8),
          ease: "easeInOut",
          opacity: { duration: 0.4 },
        }}
      />

      {/* h2, ello */}
      <motion.path
        animate={animateProps}
        d="M55.1624 181.135C60.6251 133.114 81.4118 98.0479 107.963 98.0479C123.844 98.0479 133.937 110.703 131.071 128.817C129.457 139.487 127.587 150.405 125.408 163.06C122.869 178.941 130.128 191.348 152.122 191.348C184.197 191.348 219.189 173.523 237.097 145.915C243.198 136.509 245.68 128.073 245.928 119.884C246.176 104.996 237.739 93.8296 222.851 93.8296C203.992 93.8296 189.6 115.17 189.6 142.465C189.6 171.745 205.481 192.341 239.208 192.341C285.066 192.341 335.86 137.292 359.199 75.8585C365.788 58.513 368.26 42.4065 368.26 31.1512C368.26 17.8057 364.042 7.55823 352.131 7.55823C340.469 7.55823 332.777 16.6141 325.829 30.9129C317.688 47.4967 311.667 71.4162 309.203 98.4549C303 166.301 316.896 191.348 349.936 191.348C390 191.348 434.542 135.534 457.286 75.6686C463.803 58.513 466.275 42.4065 466.275 31.1512C466.275 17.8057 462.057 7.55823 450.146 7.55823C438.484 7.55823 430.792 16.6141 423.844 30.9129C415.703 47.4967 409.682 71.4162 407.218 98.4549C401.015 166.301 414.911 191.348 444.416 191.348C473.874 191.348 489.877 165.67 499.471 138.402C508.955 111.447 520.618 94.8221 544.935 94.8221C565.035 94.8221 580.916 109.71 580.916 137.75C580.916 168.768 560.792 192.093 535.362 192.341C512.984 192.589 498.285 174.475 499.774 147.179C501.511 116.907 519.873 94.8221 543.943 94.8221C557.839 94.8221 569.51 100.999 578.682 107.725C603.549 125.866 622.709 114.656 630.047 96.7186"
        initial={initialProps}
        onAnimationComplete={handleComplete}
        style={{ strokeLinecap: "round" }}
        transition={{
          delay: calc(0.7),
          duration: calc(2.8),
          ease: "easeInOut",
          opacity: { delay: calc(0.7), duration: 0.7 },
        }}
      />
    </motion.svg>
  )
}

// KangaFlow wordmark: one gradient stroke drawn with the same pathLength trick
// as the lettering above. Self-contained gradient (cyan → pink) so it reads on
// every theme background. Source: assets/logo.svg.
const KANGAFLOW_LOGO_D =
  "M235.52891872600594 281.4371176993752C235.92811916545907 257.8842231070901 237.52492092327157 154.69060687580756 237.9241213627247 140.11975014566434C238.32332180217782 125.5488934155211 225.3492719161101 194.41117775796903 237.9241213627247 194.0119773185159C250.49897080933928 193.61277687906278 307.78439408814785 141.51696439940784 313.3732180424122 137.7245475089456C318.96204199667653 133.93213061848334 278.84229356324556 158.28342354654325 271.4570650883106 171.25747597574247C264.0718366133757 184.23152840494168 261.67662126099947 198.40319486815784 269.0618471928028 215.5688620841409C276.44707312460616 232.73452930012397 303.79237189169606 276.04788633544297 315.76842067913094 274.25147927164085C327.7444694665658 272.45507220783884 322.9540641931283 199.60079872964872 340.9181399174122 204.7904197013284C358.88221564169606 209.9800406730081 411.77643154338875 295.8083691235289 423.55287502483407 305.38920510171897C435.3293185062794 314.97004107990915 385.6286959476856 268.2634574210549 411.57680080608407 262.275435570469C437.5249056644825 256.2874137198831 551.2973869470345 268.263467593581 579.2415041752247 269.46107399820335"
const KANGAFLOW_LOGO_TRANSFORM =
  "matrix(0.8552315624999999,0,0,0.8552315624999999,52.919468154139565,10.13515450322393)"

function KangaFlowLogo({
  className,
  speed = 1,
  onAnimationComplete,
}: {
  className?: string
  speed?: number
  onAnimationComplete?: () => void
}) {
  const gradientId = useId()

  return (
    <motion.svg
      aria-hidden
      className={cn("h-50 w-auto", className)}
      fill="none"
      viewBox="0 0 800 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        animate={animateProps}
        d={KANGAFLOW_LOGO_D}
        initial={initialProps}
        stroke={`url(#${gradientId})`}
        strokeWidth={19}
        style={{ strokeLinecap: "round" }}
        transform={KANGAFLOW_LOGO_TRANSFORM}
        transition={{ duration: 1.4 * speed, ease: "easeInOut" }}
        {...(onAnimationComplete ? { onAnimationComplete } : {})}
      />
      <defs>
        <linearGradient id={gradientId}>
          <stop offset="0" stopColor="hsl(184, 74%, 44%)" />
          <stop offset="1" stopColor="hsl(332, 87%, 70%)" />
        </linearGradient>
      </defs>
    </motion.svg>
  )
}

// Milliseconds the fully-revealed intro holds before handing off to content.
const INTRO_HOLD_MS = 1200

// Rotate a horizontal writing-axis viewBox ("minX minY W H") into its vertical
// (tategaki — 縦書き) counterpart by swapping width and height. Orientation is a
// presentation concern, so it lives here rather than in the generated path data.
function toVerticalViewBox(viewBox: string): string {
  const [minX = "0", minY = "0", width = "0", height = "0"] = viewBox.split(" ")
  return `${minX} ${minY} ${height} ${width}`
}

// A word written in kana: KanjiVG strokes drawn one at a time with the shared
// cascade (strokeTransition), matching the こんにちは greeting. Rendered tategaki
// (top-to-bottom): each glyph's baked offset (`stroke.x`) becomes a Y translate
// and the viewBox is rotated. `label` is the accessible text; the final stroke
// reports completion.
function DrawnKana({
  strokes,
  viewBox,
  label,
  className,
  speed = 1,
  onAnimationComplete,
}: {
  strokes: readonly IntroStroke[]
  viewBox: string
  label: string
  className?: string
  speed?: number
  onAnimationComplete?: () => void
}) {
  return (
    <motion.svg
      className={cn("h-auto w-20", className)}
      fill="none"
      role="img"
      stroke="currentColor"
      strokeWidth={5.5}
      viewBox={toVerticalViewBox(viewBox)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{label}</title>
      {strokes.map((stroke, index, all) => (
        <motion.path
          animate={animateProps}
          d={stroke.d}
          initial={initialProps}
          key={`${stroke.d}${index}`}
          style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
          transform={`translate(0 ${stroke.x})`}
          transition={strokeTransition(index, speed)}
          {...(index === all.length - 1 && onAnimationComplete
            ? { onAnimationComplete }
            : {})}
        />
      ))}
    </motion.svg>
  )
}

type AppleHelloIntroProps = {
  brand: string
  welcome: string
  locale: "en" | "ja"
  // Multiplies every beat's timing (and the greeting's), matching the effects'
  // convention: larger = slower/longer, smaller = snappier.
  speed?: number
  onAnimationComplete?: () => void
  forceVisibleAlways?: boolean
}

type BeatDef = {
  id: string
  render: (onDone: () => void) => React.ReactElement
}

// Staged beats after the hand-drawn greeting; each advances the next when its
// final stroke finishes, so the chain can't stall. Both locales draw the brand
// カンガフロウ (KangaFlow in katakana) beside the logo; JA adds へようこそ, reading
// "こんにちは / カンガフロウ / へようこそ" — EN stops at "hello / カンガフロウ".
// `brand`/`welcome` supply the accessible labels.
function AppleHelloIntro({
  brand,
  welcome,
  locale,
  speed = 1,
  onAnimationComplete,
  forceVisibleAlways = true,
}: AppleHelloIntroProps) {
  const [step, setStep] = useState(0)
  const completedRef = useRef(false)

  const HelloEffect =
    locale === "ja" ? AppleHelloJapaneseEffect : AppleHelloEnglishEffect

  const katakanaBrandBeat: BeatDef = {
    id: "katakana-brand",
    render: (onDone) => (
      <DrawnKana
        label={brand}
        onAnimationComplete={onDone}
        speed={speed}
        strokes={INTRO_BRAND.strokes}
        viewBox={INTRO_BRAND.viewBox}
      />
    ),
  }

  const brandBeat: BeatDef = {
    id: "brand",
    render: (onDone) => (
      <KangaFlowLogo onAnimationComplete={onDone} speed={speed} />
    ),
  }
  //
  // const heBeat: BeatDef = {
  //   id: "he",
  //   render: (onDone) => (
  //     <DrawnKana
  //       label="he"
  //       onAnimationComplete={onDone}
  //       speed={speed}
  //       strokes={INTRO_JA_HE.strokes}
  //       // へ alone fills one glyph cell; crop to a square box (its source viewBox
  //       // reserves 5 cells to align with ようこそ) so it centers in the column.
  //       viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`}
  //     />
  //   ),
  // }
  const welcomeBeat: BeatDef = {
    id: "welcome",
    render: (onDone) => (
      <DrawnKana
        label={welcome}
        onAnimationComplete={onDone}
        speed={speed}
        strokes={INTRO_JA_WELCOME.strokes}
        viewBox={INTRO_JA_WELCOME.viewBox}
      />
    ),
  }

  const beats: BeatDef[] =
    locale === "ja" ? [katakanaBrandBeat, welcomeBeat] : []

  const brandLogo: BeatDef[] = [brandBeat]

  // Guarded so the hold-then-handoff fires exactly once.
  const finish = () => {
    if (completedRef.current) {
      return
    }
    completedRef.current = true
    setTimeout(() => onAnimationComplete?.(), INTRO_HOLD_MS * speed)
  }

  return (
    <div
      className={`mb-100 flex min-h-120 md:min-w-200 ${locale === "ja" ? "flex-row-reverse justify-between text-right" : "flex-col items-center text-center"}`}
    >
      <HelloEffect
        forceVisibleAlways={forceVisibleAlways}
        onAnimationComplete={() => setStep(0.5)}
        speed={speed}
      />

      {brandLogo.map(({ id, render }, index) =>
        step >= 0.5 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            key={id}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {render(
              index === brandLogo.length - 1
                ? () => {
                    setStep(1)
                    if (locale === "en") finish()
                  }
                : () => {}
            )}
          </motion.div>
        ) : null
      )}

      <div className={`${locale === "ja" && "flex min-w-45 flex-row-reverse"}`}>
        {beats.map(({ id, render }, index) =>
          step >= index + 1 ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 12 }}
              key={id}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {render(
                index === beats.length - 1 ? finish : () => setStep(index + 2)
              )}
            </motion.div>
          ) : null
        )}
      </div>
    </div>
  )
}

export { AppleHelloEnglishEffect, AppleHelloIntro, AppleHelloJapaneseEffect }

// Demo
export function Demo() {
  const [language, setLanguage] = useState<"english" | "japanese">("english")

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-black">
      {language === "english" ? (
        <AppleHelloEnglishEffect
          className="h-24 text-white"
          onAnimationComplete={() =>
            setTimeout(() => setLanguage("japanese"), 1000)
          }
        />
      ) : (
        <AppleHelloJapaneseEffect
          className="h-24 text-white"
          onAnimationComplete={() =>
            setTimeout(() => setLanguage("english"), 1000)
          }
        />
      )}
      <p className="text-sm text-white/50">
        Animation cycles between English and Japanese
      </p>
    </div>
  )
}
