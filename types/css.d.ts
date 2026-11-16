// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Let `style` accept CSS custom properties (`--rarity`, ...) without casting the
// whole object to CSSProperties, which would also silence typos in real keys.
import "react"

declare module "react" {
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined
  }
}
