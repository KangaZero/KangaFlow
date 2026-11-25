"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// One project trading card. The shell is an <article> (a <button> would
// flatten the 3D flip), the front carries a full-size transparent flip
// button, and the back is the D1 "slanted panel": hero stat, language bar,
// three moves (each opens the move drawer) and the card's links. Whichever
// face points away is `inert`, so it can't be clicked or tabbed into.

import { ExternalLink, Play } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
} from "react"
import type { IconType } from "react-icons"
import { FaGithub } from "react-icons/fa6"
import {
  SiCss,
  SiGnubash,
  SiJavascript,
  SiLua,
  SiNixos,
  SiRust,
  SiSwift,
  SiTypescript,
  SiVuedotjs,
} from "react-icons/si"
import { KangaFlowLogo } from "@/components/ui/kangaflow-logo"
import { useCardSpring } from "@/hooks/use-card-spring"
import { interpolate } from "@/lib/i18n"
import { hrefForRoute } from "@/lib/pages"
import type {
  CardLink,
  CardType,
  Language,
  LanguageShare,
  MoveCost,
  ProjectCard,
} from "@/lib/projects"
import { useLocale } from "@/providers/locale-provider"

// GitHub linguist colours + Simple Icons marks: identity constants, not
// themeable (same reasoning as TECH_ICONS in about-section.tsx).
const LANGUAGE_BRAND: Record<
  Language | "Other",
  { color: string; Icon: IconType | null }
> = {
  CSS: { color: "#663399", Icon: SiCss },
  JavaScript: { color: "#f1e05a", Icon: SiJavascript },
  Lua: { color: "#000080", Icon: SiLua },
  Nix: { color: "#7e7eff", Icon: SiNixos },
  Other: { color: "#9aa0a6", Icon: null },
  Rust: { color: "#dea584", Icon: SiRust },
  Shell: { color: "#89e051", Icon: SiGnubash },
  Swift: { color: "#F05138", Icon: SiSwift },
  TypeScript: { color: "#3178c6", Icon: SiTypescript },
  Vue: { color: "#41b883", Icon: SiVuedotjs },
}

/** Decorative type glyph in the card's corner. */
const TYPE_GLYPH: Record<CardType, string> = {
  cli: "λ",
  supporter: "❄",
  tool: "⌘",
  web: "◆",
}

// Sparkle positions around the SSR (x%, y%, delay s).
const SPARKS = [
  [8, 12, 0],
  [88, 6, 0.6],
  [94, 48, 1.2],
  [4, 62, 0.3],
  [50, -2, 0.9],
  [70, 96, 1.5],
] as const

export type TradingCardProps = {
  card: ProjectCard
  /** Slot in the hand (stagger index). */
  index: number
  /** Offset from the fan's centre, in slots. */
  offset: number
  revealed: boolean
  flipped: boolean
  dragging: boolean
  settling: boolean
  /** Spring tilt on (off under reduced motion and while dragging). */
  tilt: boolean
  onFlip: () => void
  onUnflip: () => void
  onOpenMove: (moveIndex: number) => void
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}

export function TradingCard({
  card,
  index,
  offset,
  revealed,
  flipped,
  dragging,
  settling,
  tilt,
  onFlip,
  onUnflip,
  onOpenMove,
  onPointerDown,
}: TradingCardProps) {
  const { translate } = useLocale()
  const articleRef = useRef<HTMLElement>(null)
  const hitRef = useRef<HTMLButtonElement>(null)
  const unflipRef = useRef<HTMLButtonElement>(null)
  const nameId = useId()
  const ssr = card.rarity === "ssr"
  useCardSpring(articleRef, tilt && revealed)

  // The face that had focus turns inert on flip, so hand focus across:
  // front button → back's "flip back", and back again. Only when focus was
  // already on this card (a pointer flip shouldn't scroll anything).
  const wasFlipped = useRef(flipped)
  useEffect(() => {
    if (wasFlipped.current === flipped) return
    wasFlipped.current = flipped
    const article = articleRef.current
    const active = document.activeElement
    if (
      !article ||
      (active && active !== document.body && !article.contains(active))
    )
      return
    const target = flipped ? unflipRef.current : hitRef.current
    target?.focus({ preventScroll: true })
  }, [flipped])

  const vars: CSSProperties = {
    "--i": index,
    "--off": offset,
    "--z": ssr ? 4 : 3 - Math.abs(Math.round(offset)),
  }

  return (
    <article
      aria-labelledby={nameId}
      className={`card-hand-card tc-card tc-type-${card.type}`}
      data-card-id={card.id}
      data-dragging={dragging}
      data-flipped={flipped}
      data-revealed={revealed}
      data-settling={settling}
      data-ssr={ssr}
      inert={!revealed}
      onPointerDown={onPointerDown}
      ref={articleRef}
      style={vars}
    >
      <div className="tc-tilt">
        <CardCover />
        <div className="tc-rot">
          {ssr ? (
            <>
              <span aria-hidden className="tc-sparks">
                {SPARKS.map(([x, y, delay]) => (
                  <i
                    key={`${x}-${y}`}
                    style={{ "--d": delay, left: `${x}%`, top: `${y}%` }}
                  />
                ))}
              </span>
              <span aria-hidden className="tc-ribbon">
                {translate("about.projects.rarity.ssr")}
              </span>
            </>
          ) : null}
          <div className="tc-face tc-front" inert={flipped}>
            <div className="tc-inner">
              <div className="tc-top">
                <span className="tc-stage">
                  {translate(
                    card.rarity === "supporter"
                      ? "about.projects.stage.supporter"
                      : "about.projects.stage.project"
                  )}
                </span>
                <h3 className="tc-name" id={nameId}>
                  {card.name}
                </h3>
                <span aria-hidden className="tc-glyph">
                  {TYPE_GLYPH[card.type]}
                </span>
              </div>
              <div className="tc-art">
                <Image alt="" fill sizes="320px" src={card.image} />
              </div>
              <p className="tc-sub">
                {translate(`about.projects.cards.${card.id}.sub`)}
              </p>
              <p className="tc-blurb">
                {translate(`about.projects.cards.${card.id}.blurb`)}
              </p>
              <p className="tc-foot">
                <span>{card.setCode}</span>
                <span className="tc-rarity">
                  {translate(`about.projects.rarity.${card.rarity}`)}
                </span>
              </p>
            </div>
            <button
              aria-label={interpolate(translate("about.projects.flip"), {
                name: card.name,
              })}
              className="tc-hit"
              onClick={onFlip}
              ref={hitRef}
              type="button"
            />
          </div>
          <div className="tc-face tc-back" inert={!flipped}>
            <CardBack
              card={card}
              onOpenMove={onOpenMove}
              onUnflip={onUnflip}
              unflipRef={unflipRef}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

/** The chrome card back shown while a card is still face down. */
function CardCover() {
  return (
    <div aria-hidden className="tc-cover">
      <span className="tc-cover-frame" />
      <span className="tc-cover-label">SERIES 01</span>
      <span className="tc-emblem">
        <KangaFlowLogo animated={false} aria-hidden className="h-auto" />
      </span>
      <span className="tc-cover-label">KANGAFLOW</span>
      <i className="tc-corner" />
      <i className="tc-corner" />
      <i className="tc-corner" />
      <i className="tc-corner" />
    </div>
  )
}

function CardBack({
  card,
  onUnflip,
  onOpenMove,
  unflipRef,
}: {
  card: ProjectCard
  onUnflip: () => void
  onOpenMove: (moveIndex: number) => void
  unflipRef: React.RefObject<HTMLButtonElement | null>
}) {
  const { translate } = useLocale()
  return (
    <div className="tc-inner">
      <span aria-hidden className="tc-ghost">
        {card.hero.value}
      </span>
      <div className="tc-back-head">
        <p className="tc-d1-name">{card.name}</p>
        <button
          aria-label={translate("about.projects.unflip")}
          className="tc-unflip"
          onClick={onUnflip}
          ref={unflipRef}
          type="button"
        >
          <span aria-hidden>↺</span>
        </button>
      </div>
      <p className="tc-stat">
        <b>{card.hero.value}</b>
        {translate(`about.projects.hero.${card.hero.unit}`)}
      </p>
      <LanguageBar shares={card.languages} />
      <ol className="tc-moves">
        {card.moves.map((move, k) => {
          const name = translate(`about.projects.moves.${move.id}.name`)
          return (
            <li key={move.id}>
              <button
                aria-label={interpolate(
                  translate("about.projects.moveDetails"),
                  { move: name }
                )}
                className="tc-move"
                onClick={() => onOpenMove(k)}
                style={{ "--k": k }}
                type="button"
              >
                <span aria-hidden className="tc-move-no">
                  0{k + 1}
                </span>
                <span className="tc-move-name">{name}</span>
                <Pips count={move.cost} />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="tc-links">
        {card.links.map((link) => (
          <CardLinkButton key={link.kind} link={link} />
        ))}
      </div>
    </div>
  )
}

const PIP_KEYS = ["first", "second", "third"] as const

export function Pips({ count }: { count: MoveCost }) {
  return (
    <span aria-hidden className="tc-pips">
      {PIP_KEYS.slice(0, count).map((key) => (
        <i key={key} />
      ))}
    </span>
  )
}

function LanguageBar({ shares }: { shares: readonly LanguageShare[] }) {
  const { translate } = useLocale()
  const named = shares.filter((share) => share.language !== "Other")
  const summary = named
    .map((share) => `${share.language} ${share.percent}%`)
    .join(", ")
  return (
    <div className="tc-langs">
      <span aria-hidden className="tc-lbar">
        {shares.map((share) => (
          <i
            key={share.language}
            style={{
              "--lc": LANGUAGE_BRAND[share.language].color,
              "--share": share.percent,
            }}
          />
        ))}
      </span>
      <ul
        aria-label={interpolate(translate("about.projects.languages"), {
          list: summary,
        })}
        className="tc-licons"
      >
        {named.slice(0, 4).map((share) => {
          const { color, Icon } = LANGUAGE_BRAND[share.language]
          return (
            <li
              className="tc-li"
              key={share.language}
              style={{ "--lc": color }}
              title={`${share.language} ${share.percent}%`}
            >
              {Icon ? <Icon aria-hidden /> : null}
              <em>{share.percent >= 1 ? Math.round(share.percent) : "<1"}%</em>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CardLinkButton({ link }: { link: CardLink }) {
  const { locale, translate } = useLocale()
  const label = translate(`about.projects.links.${link.kind}`)
  if (link.kind === "enter")
    return (
      <Link className="tc-link" href={hrefForRoute(locale, link.route)}>
        <Play aria-hidden />
        {label}
      </Link>
    )
  const Icon =
    link.kind === "website"
      ? ExternalLink
      : link.kind === "prs"
        ? SiNixos
        : FaGithub
  return (
    <a className="tc-link" href={link.href} rel="noreferrer" target="_blank">
      <Icon aria-hidden />
      {label}
    </a>
  )
}
