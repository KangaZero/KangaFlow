"use client"

import { Slider as SliderPrimitive } from "radix-ui"
import * as React from "react"
import { cn } from "@/lib/utils"

function Slider({
  className,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  // Derive the thumb count from whichever value prop is controlling the slider,
  // falling back to a single thumb spanning [min, max]. `value`/`defaultValue`
  // stay inside `props` so they're only forwarded when actually set — passing an
  // explicit `undefined` would violate exactOptionalPropertyTypes.
  const values = React.useMemo(
    () =>
      Array.isArray(props.value)
        ? props.value
        : Array.isArray(props.defaultValue)
          ? props.defaultValue
          : [min, max],
    [props.value, props.defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50",
        className
      )}
      data-slot="slider"
      max={max}
      min={min}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1.5"
        )}
        data-slot="slider-track"
      >
        <SliderPrimitive.Range
          className={cn(
            "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
          data-slot="slider-range"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          className="block size-3.5 shrink-0 rounded-full border border-primary bg-background shadow-sm transition-[color,box-shadow] hover:ring-4 hover:ring-ring/50 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          data-slot="slider-thumb"
          // biome-ignore lint/suspicious/noArrayIndexKey: thumbs are positional and have no stable id
          key={index}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
