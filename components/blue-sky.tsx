// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "./blue-sky.css"

// Light-theme background: a self-authored CSS blue sky — warm sun and drifting
// parallax clouds. The birds live in their own canvas (components/sky-birds)
// layered above the WebGL Clouds. Chosen over registry backgrounds because
// none offer a true sky and they carry a Commons-Clause licence; this is
// dependency-free and licence-clean. Palette is complementary (cool blue sky vs
// warm amber sun) with white clouds as the neutral. Decorative
// only (aria-hidden); the parent controls positioning.

export function BlueSky({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`blue-sky ${className ?? ""}`}>
      <div className="blue-sky-sun" />
      <div className="blue-sky-clouds blue-sky-clouds-back" />
      <div className="blue-sky-clouds blue-sky-clouds-front" />
    </div>
  )
}
