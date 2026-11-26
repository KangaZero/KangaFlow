// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// HTML-in-Canvas (WICG, Chrome 157+ on by default) attributes, typed so the
// canvasui components need no @ts-expect-error. Chrome 157 renamed the opt-in:
// the canvas needs `content="drawable"` (React already types `content`) and
// every drawn child needs `drawable`; older builds / Brave still read
// `layoutsubtree`, so both spellings are set.
// Spec: https://github.com/WICG/html-in-canvas
import "react"

declare module "react" {
  interface CanvasHTMLAttributes<T> {
    layoutsubtree?: "true" | undefined
  }
  interface HTMLAttributes<T> {
    drawable?: "" | undefined
  }
}
