import { type MotionValue, motion, useSpring, useTransform } from "motion/react"
import type React from "react"
import { useEffect } from "react"

type PlaceValue = number | "."

interface DigitColumnProps {
  mv: MotionValue<number>
  number: number
  height: number
}

// Renamed from `Number` (which shadowed the global). One of the ten stacked
// digits in a column, translated by the spring.
function DigitColumn({ mv, number, height }: DigitColumnProps) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10
    const offset = (10 + number - placeValue) % 10
    let memo = offset * height
    if (offset > 5) {
      memo -= 10 * height
    }
    return memo
  })

  // No CSSProperties annotation: it carries no `x`, so the inferred type stays
  // assignable to motion's MotionStyle (CSSProperties' `x?` would clash).
  const baseStyle = {
    alignItems: "center",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    position: "absolute",
  } as const

  return <motion.span style={{ ...baseStyle, y }}>{number}</motion.span>
}

function normalizeNearInteger(num: number): number {
  const nearest = Math.round(num)
  const tolerance = 1e-9 * Math.max(1, Math.abs(num))
  return Math.abs(num - nearest) < tolerance ? nearest : num
}

function getValueRoundedToPlace(value: number, place: number): number {
  const scaled = value / place
  return Math.floor(normalizeNearInteger(scaled))
}

interface DigitProps {
  place: PlaceValue
  value: number
  height: number
  digitStyle?: React.CSSProperties | undefined
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
  // Hooks run unconditionally (rules of hooks); "." resolves to 0 and is
  // rendered below without the digit stack.
  const valueRoundedToPlace =
    place === "." ? 0 : getValueRoundedToPlace(value, place)
  const animatedValue = useSpring(valueRoundedToPlace)

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace)
  }, [animatedValue, valueRoundedToPlace])

  // Decimal point digit
  if (place === ".") {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ height, width: "fit-content", ...digitStyle }}
      >
        .
      </span>
    )
  }

  const defaultStyle: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    height,
    position: "relative",
    width: "1ch",
  }

  return (
    <span
      className="relative inline-flex overflow-hidden"
      style={{ ...defaultStyle, ...digitStyle }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 0–9 digit columns, never reordered.
        <DigitColumn height={height} key={i} mv={animatedValue} number={i} />
      ))}
    </span>
  )
}

interface CounterProps {
  value: number
  fontSize?: number
  padding?: number
  /**
   * An array of place values that determines which digit positions
   * should be displayed. For decimal places, use "." to represent
   * the decimal point. Leave this prop empty to enable automatic
   * detection based on the current value.
   */
  places?: PlaceValue[]
  gap?: number
  borderRadius?: number
  horizontalPadding?: number
  textColor?: string
  fontWeight?: React.CSSProperties["fontWeight"]
  containerStyle?: React.CSSProperties
  counterStyle?: React.CSSProperties
  digitStyle?: React.CSSProperties
  gradientHeight?: number
  gradientFrom?: string
  gradientTo?: string
  topGradientStyle?: React.CSSProperties
  bottomGradientStyle?: React.CSSProperties
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places = [...value.toString()].map((ch, i, a) => {
    if (ch === ".") {
      return "."
    }

    const dotIndex = a.indexOf(".")
    const isInteger = dotIndex === -1

    const exponent = isInteger
      ? a.length - i - 1
      : i < dotIndex
        ? dotIndex - i - 1
        : -(i - dotIndex)

    return 10 ** exponent
  }),
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = "inherit",
  fontWeight = "inherit",
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = "black",
  gradientTo = "transparent",
  topGradientStyle,
  bottomGradientStyle,
}: CounterProps) {
  const height = fontSize + padding

  const defaultContainerStyle: React.CSSProperties = {
    display: "inline-block",
    position: "relative",
  }

  const defaultCounterStyle: React.CSSProperties = {
    borderRadius,
    color: textColor,
    direction: "ltr",
    display: "flex",
    fontSize,
    fontWeight,
    gap,
    lineHeight: 1,
    overflow: "hidden",
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
  }

  const gradientContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    inset: 0,
    justifyContent: "space-between",
    pointerEvents: "none",
    position: "absolute",
  }

  const defaultTopGradientStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
    height: gradientHeight,
  }

  const defaultBottomGradientStyle: React.CSSProperties = {
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
    height: gradientHeight,
  }

  return (
    <span style={{ ...defaultContainerStyle, ...containerStyle }}>
      <span style={{ ...defaultCounterStyle, ...counterStyle }}>
        {places.map((place) => (
          <Digit
            digitStyle={digitStyle}
            height={height}
            key={place}
            place={place}
            value={value}
          />
        ))}
      </span>
      <span style={gradientContainerStyle}>
        <span style={topGradientStyle ?? defaultTopGradientStyle} />
        <span style={bottomGradientStyle ?? defaultBottomGradientStyle} />
      </span>
    </span>
  )
}
