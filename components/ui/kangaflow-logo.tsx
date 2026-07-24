"use client"

import { motion } from "motion/react"
import { useId } from "react"
import { cn } from "@/lib/utils"

// Single-stroke KangaFlow wordmark, drawn with the pathLength trick so it can
// either animate on (a pen tracing the mark) or render instantly. The gradient
// (cyan → pink) is self-contained and theme-independent — it's a brand-identity
// constant, like the Simple Icons brand hues, so it lives here, not as a token.
// Source: assets/logo.svg.
const KANGAFLOW_LOGO_D =
  "M235.52891872600594 281.4371176993752C235.92811916545907 257.8842231070901 237.52492092327157 154.69060687580756 237.9241213627247 140.11975014566434C238.32332180217782 125.5488934155211 225.3492719161101 194.41117775796903 237.9241213627247 194.0119773185159C250.49897080933928 193.61277687906278 307.78439408814785 141.51696439940784 313.3732180424122 137.7245475089456C318.96204199667653 133.93213061848334 278.84229356324556 158.28342354654325 271.4570650883106 171.25747597574247C264.0718366133757 184.23152840494168 261.67662126099947 198.40319486815784 269.0618471928028 215.5688620841409C276.44707312460616 232.73452930012397 303.79237189169606 276.04788633544297 315.76842067913094 274.25147927164085C327.7444694665658 272.45507220783884 322.9540641931283 199.60079872964872 340.9181399174122 204.7904197013284C358.88221564169606 209.9800406730081 411.77643154338875 295.8083691235289 423.55287502483407 305.38920510171897C435.3293185062794 314.97004107990915 385.6286959476856 268.2634574210549 411.57680080608407 262.275435570469C437.5249056644825 256.2874137198831 551.2973869470345 268.263467593581 579.2415041752247 269.46107399820335"
const KANGAFLOW_LOGO_TRANSFORM =
  "matrix(0.8552315624999999,0,0,0.8552315624999999,52.919468154139565,10.13515450322393)"

type KangaFlowLogoProps = React.ComponentProps<typeof motion.svg> & {
  // Multiplies the draw duration (larger = slower). Ignored when animated=false.
  speed?: number
  // Draw the mark on (true) or render it fully-formed (false, e.g. a static
  // header logo).
  animated?: boolean
  // Accessible name. Pass aria-hidden via ...props to make it decorative instead.
  label?: string
  onAnimationComplete?: () => void
}

function KangaFlowLogo({
  className,
  speed = 1,
  animated = true,
  label = "KangaFlow",
  onAnimationComplete,
  ...props
}: KangaFlowLogoProps) {
  const gradientId = useId()

  return (
    <motion.svg
      className={cn("h-50 w-auto", className)}
      fill="none"
      role="img"
      viewBox="0 0 800 400"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{label}</title>
      <motion.path
        animate={{ opacity: 1, pathLength: 1 }}
        d={KANGAFLOW_LOGO_D}
        initial={animated ? { opacity: 0, pathLength: 0 } : false}
        stroke={`url(#${gradientId})`}
        strokeWidth={19}
        style={{ strokeLinecap: "round" }}
        transform={KANGAFLOW_LOGO_TRANSFORM}
        transition={
          animated
            ? { duration: 1.4 * speed, ease: "easeInOut" }
            : { duration: 0 }
        }
        {...(animated && onAnimationComplete ? { onAnimationComplete } : {})}
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

export { KangaFlowLogo, type KangaFlowLogoProps }
