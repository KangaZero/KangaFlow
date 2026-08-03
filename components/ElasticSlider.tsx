import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react"
import type React from "react"
import { useEffect, useRef, useState } from "react"

const MAX_OVERFLOW = 50

interface ElasticSliderProps {
  defaultValue?: number
  startingValue?: number
  maxValue?: number
  className?: string
  isStepped?: boolean
  stepSize?: number
  // leftIcon?: JSX.Element
}

const ElasticSlider: React.FC<ElasticSliderProps> = ({
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = "",
  isStepped = false,
  stepSize = 1,
  // leftIcon = <>-</>,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <Slider
        defaultValue={defaultValue}
        isStepped={isStepped}
        // leftIcon={leftIcon}
        maxValue={maxValue}
        startingValue={startingValue}
        stepSize={stepSize}
      />
    </div>
  )
}

interface SliderProps {
  defaultValue: number
  startingValue: number
  maxValue: number
  isStepped: boolean
  stepSize: number
  // leftIcon: JSX.Element
}

const Slider: React.FC<SliderProps> = ({
  defaultValue,
  startingValue,
  maxValue,
  isStepped,
  stepSize,
  // leftIcon,
}) => {
  const [value, setValue] = useState<number>(defaultValue)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [_region, setRegion] = useState<"left" | "middle" | "right">("middle")
  const clientX = useMotionValue(0)
  const overflow = useMotionValue(0)
  const scale = useMotionValue(1)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useMotionValueEvent(clientX, "change", (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect()
      let newValue: number
      if (latest < left) {
        setRegion("left")
        newValue = left - latest
      } else if (latest > right) {
        setRegion("right")
        newValue = latest - right
      } else {
        setRegion("middle")
        newValue = 0
      }
      overflow.jump(decay(newValue, MAX_OVERFLOW))
    }
  })

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect()
      let newValue =
        startingValue +
        ((e.clientX - left) / width) * (maxValue - startingValue)
      if (isStepped) {
        newValue = Math.round(newValue / stepSize) * stepSize
      }
      newValue = Math.min(Math.max(newValue, startingValue), maxValue)
      setValue(newValue)
      clientX.jump(e.clientX)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(e)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = () => {
    animate(overflow, 0, { bounce: 0.5, type: "spring" })
  }

  const getRangePercentage = (): number => {
    const totalRange = maxValue - startingValue
    if (totalRange === 0) return 0
    return ((value - startingValue) / totalRange) * 100
  }

  return (
    <>
      <motion.div
        className="flex w-full touch-none select-none items-center justify-center gap-4"
        onHoverEnd={() => animate(scale, 1)}
        onHoverStart={() => animate(scale, 1.2)}
        onTouchEnd={() => animate(scale, 1)}
        onTouchStart={() => animate(scale, 1.2)}
        style={{
          opacity: useTransform(scale, [1, 1.2], [0.7, 1]),
          scale,
        }}
      >
        {/*<motion.div
           animate={{
             scale: region === "left" ? [1, 1.4, 1] : 1,
             transition: { duration: 0.25 },
           }}
           style={{
             x: useTransform(() =>
               region === "left" ? -overflow.get() / scale.get() : 0
             ),
           }}
         >
           {leftIcon}
         </motion.div>
        */}
        <div
          className="relative flex w-full max-w-xs grow cursor-grab touch-none select-none items-center py-4"
          onLostPointerCapture={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={sliderRef}
        >
          <motion.div
            className="flex grow"
            style={{
              height: useTransform(scale, [1, 1.2], [6, 12]),
              marginBottom: useTransform(scale, [1, 1.2], [0, -3]),
              marginTop: useTransform(scale, [1, 1.2], [0, -3]),
              scaleX: useTransform(() => {
                if (sliderRef.current) {
                  const { width } = sliderRef.current.getBoundingClientRect()
                  return 1 + overflow.get() / width
                }
                return 1
              }),
              scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]),
              transformOrigin: useTransform(() => {
                if (sliderRef.current) {
                  const { left, width } =
                    sliderRef.current.getBoundingClientRect()
                  return clientX.get() < left + width / 2 ? "right" : "left"
                }
                return "center"
              }),
            }}
          >
            <div className="relative h-full grow overflow-hidden rounded-full bg-muted">
              <div
                className="absolute h-full rounded-full bg-primary"
                style={{ width: `${getRangePercentage()}%` }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
      <p className="absolute -translate-y-4 transform font-medium text-muted-foreground text-xs tracking-wide">
        {Math.round(value)}
      </p>
    </>
  )
}

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0
  }
  const entry = value / max
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5)
  return sigmoid * max
}

export default ElasticSlider
