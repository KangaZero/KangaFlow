// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// HTML-in-Canvas (WICG, Chrome 157+ on by default) attributes, typed so the
// canvasui components need no @ts-expect-error. Chrome 157 renamed the opt-in:
// the canvas needs `content="drawable"` (React already types `content`) and
// every drawn child needs `drawable`; older builds / Brave still read
// `layoutsubtree`, so both spellings are set.
// Spec: https://github.com/WICG/html-in-canvas
import "react"

declare module "react" {
  // biome-ignore lint/correctness/noUnusedVariables: declaration merging must repeat React's type parameter.
  interface CanvasHTMLAttributes<T> {
    layoutsubtree?: "true" | undefined
  }
  // biome-ignore lint/correctness/noUnusedVariables: declaration merging must repeat React's type parameter.
  interface HTMLAttributes<T> {
    drawable?: "" | undefined
  }
}
