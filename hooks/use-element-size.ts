// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { type RefObject, useEffect, useState } from "react"

export type ElementSize = { width: number; height: number }

/**
 * The element's border-box size, kept current by a ResizeObserver. Starts at
 * 0×0 until the first observation (layout effects never run in the static
 * export's prerender, so callers must render sensibly at zero).
 */
export function useElementSize(
  ref: RefObject<HTMLElement | null>
): ElementSize {
  const [size, setSize] = useState<ElementSize>({ height: 0, width: 0 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize[0]
      if (!box) return
      setSize((previous) =>
        previous.width === box.inlineSize && previous.height === box.blockSize
          ? previous
          : { height: box.blockSize, width: box.inlineSize }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}
