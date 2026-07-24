"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { createContext, useContext, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const MouseEnterContext = createContext<
  [boolean, React.Dispatch<React.SetStateAction<boolean>>] | undefined
>(undefined)

export function CardContainer({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMouseEntered, setIsMouseEntered] = useState(false)

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return
    }
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect()
    const x = (event.clientX - left - width / 2) / 25
    const y = (event.clientY - top - height / 2) / 25
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
  }

  const handleMouseEnter = () => {
    setIsMouseEntered(true)
  }

  const handleMouseLeave = () => {
    if (!containerRef.current) {
      return
    }
    setIsMouseEntered(false)
    containerRef.current.style.transform = "rotateY(0deg) rotateX(0deg)"
  }

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={cn(
          "flex items-center justify-center py-20",
          containerClassName
        )}
        style={{ perspective: "1000px" }}
      >
        {/** biome-ignore lint/a11y/noStaticElementInteractions: decorative 3D tilt driven by pointer position; interactive children carry their own semantics. */}
        <div
          className={cn(
            "relative flex items-center justify-center transition-all duration-200 ease-linear",
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          ref={containerRef}
          style={{ transformStyle: "preserve-3d" }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-96 w-96 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardItem({
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  translateX?: number | string
  translateY?: number | string
  translateZ?: number | string
  rotateX?: number | string
  rotateY?: number | string
  rotateZ?: number | string
} & React.ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement>(null)
  const [isMouseEntered] = useMouseEnter()

  useEffect(() => {
    if (!ref.current) {
      return
    }
    ref.current.style.transform = isMouseEntered
      ? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
      : "translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)"
  }, [
    isMouseEntered,
    translateX,
    translateY,
    translateZ,
    rotateX,
    rotateY,
    rotateZ,
  ])

  return (
    <div
      className={cn("w-fit transition duration-200 ease-linear", className)}
      ref={ref}
      {...rest}
    >
      {children}
    </div>
  )
}

// Hook to read the shared mouse-enter state; throws when used outside a
// CardContainer so the misuse surfaces at development time.
export function useMouseEnter() {
  const context = useContext(MouseEnterContext)
  if (context === undefined) {
    throw new Error("useMouseEnter must be used within a CardContainer")
  }
  return context
}
