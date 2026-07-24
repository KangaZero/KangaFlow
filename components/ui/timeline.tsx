"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useScroll, useTransform } from "motion/react"
import type * as React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type TimelineEntry = {
  title: React.ReactNode
  content: React.ReactNode
}

export function Timeline({ data }: { data: TimelineEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  // Stable keys for a list whose entries carry no id: derived once so re-renders
  // don't remount rows. Static timelines don't mutate `data`, so this is safe.
  const [entries] = useState(() =>
    data.map((item) => ({ id: crypto.randomUUID(), item }))
  )

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setHeight(rect.height)
    }
  }, [])

  const { scrollYProgress } = useScroll({
    offset: ["start 10%", "end 50%"],
    target: containerRef,
  })

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  return (
    <div className="w-full font-sans md:px-10" ref={containerRef}>
      <div className="relative mx-auto max-w-7xl pb-20" ref={ref}>
        {entries.map(({ id, item }) => (
          <div className="flex justify-start pt-10 md:gap-10 md:pt-40" key={id}>
            <div className="sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
              <div className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-background">
                <div className="h-4 w-4 rounded-full border border-border bg-primary/40 p-2" />
              </div>
              <h3 className="hidden font-bold text-muted-foreground text-xl md:block md:pl-20 md:text-5xl">
                {item.title}
              </h3>
            </div>

            <div className="relative w-full pr-4 pl-20 md:pl-4">
              <h3 className="mb-4 block text-left font-bold text-2xl text-muted-foreground md:hidden">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        <div
          className={cn(
            "absolute top-0 left-8 w-[2px] overflow-hidden",
            "bg-linear-to-b from-transparent via-border to-transparent",
            "[mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
          )}
          style={{ height: `${height}px` }}
        >
          <motion.div
            className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-linear-to-t from-primary via-primary to-transparent"
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
          />
        </div>
      </div>
    </div>
  )
}
