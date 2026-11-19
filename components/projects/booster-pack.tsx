"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The sealed booster: a React Bits TearTicket whose body is the chrome pack
// art and whose stub is the "tear here" strip. Dragging the right edge off
// (or Enter/Space on the focused stub) fires onTear. Only the pack tears;
// the cards burst out of it (see project-cards.tsx).

import TearTicket from "@/components/react-bits/tear-ticket"
import { KangaFlowLogo } from "@/components/ui/kangaflow-logo"
import { useLocale } from "@/providers/locale-provider"

const STUB = 52

export function BoosterPack({
  width,
  onTear,
}: {
  /** Pack body width in px (the stub is added on the right). */
  width: number
  onTear: () => void
}) {
  const { translate } = useLocale()
  return (
    // Explicit width: TearTicket sizes itself as min(width, 100%), and an
    // absolutely positioned wrapper has no width of its own to resolve that
    // against, so on narrow stages the 100% collapsed and the pack spilled
    // sideways out of the page.
    <div className="tc-pack" style={{ width: width + STUB }}>
      <TearTicket
        ariaLabel={translate("about.projects.pack.ariaLabel")}
        background="var(--tc-paper)"
        border
        borderColor="var(--tc-paper-edge)"
        color="var(--tc-ink)"
        height={Math.round(width * 1.45)}
        holeSize={7}
        holes={10}
        notch={8}
        onTear={onTear}
        orientation="horizontal"
        radius={14}
        rotate={3}
        roughness={1.6}
        stub={
          <div className="tc-strip">
            <span>✂ {translate("about.projects.pack.tearHere")}</span>
          </div>
        }
        stubBackground="var(--tc-paper-stub)"
        stubSize={STUB}
        tilt
        tiltMax={10}
        width={width + STUB}
      >
        <div className="tc-pack-art">
          <div className="tc-burst">
            4<small>{translate("about.projects.pack.cards")}</small>
          </div>
          <div className="tc-emblem">
            <KangaFlowLogo animated={false} aria-hidden className="h-auto" />
          </div>
          <div aria-hidden className="tc-pack-title">
            <span>KANGA</span>
            <span>{translate("about.projects.pack.name")}</span>
          </div>
          <div className="tc-banner">
            ★ {translate("about.projects.pack.banner")} ★
          </div>
          <div aria-hidden className="tc-pack-foot">
            <span>SERIES 01</span>
            <span>KF</span>
          </div>
        </div>
      </TearTicket>
    </div>
  )
}
