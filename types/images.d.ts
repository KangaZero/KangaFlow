// Ambient declarations for static image imports (→ StaticImageData). Committed
// so `tsc` resolves `@/assets/*.png` (avatar, timeline screenshots) even on a
// clean checkout: CI runs `tsc --noEmit` before `next build`, so the generated
// (gitignored) next-env.d.ts — which normally pulls these in — isn't present.
// Mirrors what next-env.d.ts references.
/// <reference types="next/image-types/global" />
