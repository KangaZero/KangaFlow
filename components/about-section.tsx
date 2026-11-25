"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Mail } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react"
import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { IconType } from "react-icons"
import { FaGithub, FaLinkedin } from "react-icons/fa6"
import {
  SiGit,
  SiGnubash,
  SiJavascript,
  SiLua,
  SiNixos,
  SiPython,
  SiReact,
  SiRust,
  SiSwift,
  SiTypescript,
  SiVuedotjs,
} from "react-icons/si"
import { OriginCard } from "@/components/about/origin-card"
import { QuestLog } from "@/components/about/quest-log"
import { DecryptRole } from "@/components/decrypt-role"
import { HeroAvatar } from "@/components/hero-avatar"
import { LocaleTransition } from "@/components/locale-transition"
import { PageHeader } from "@/components/page-header"
import { ProjectCards } from "@/components/projects/project-cards"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { MorphText, morphGlyphCount } from "@/components/ui/morph-text"
import { avatarEnteredAtTime, leadDelayMs } from "@/lib/hero-interaction"
import type { TranslationKey } from "@/lib/i18n"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { person } from "@/lib/person"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"
import "@/components/about-section.css"
import { AppleHelloIntro } from "@/components/ui/apple-hello-effect"
import { KangaFlowLogo } from "@/components/ui/kangaflow-logo"
import type { Mutable } from "@/lib/typescript-hooks/mutable"
import { useAchievements } from "@/providers/achievements-provider"
import { useGlobalStates } from "@/providers/global-state-provider"
// Section ids + i18n labels — the single source shared with the scroll-spy
// sidebar (components/section-sidebar.tsx). Order = document order.
export const ABOUT_SECTIONS = [
  { id: "about-overview", labelKey: "about.overview" },
  { id: "about-project", labelKey: "about.project" },
  { id: "about-work", labelKey: "about.work" },
  { id: "about-education", labelKey: "about.education" },
] as const satisfies readonly { id: string; labelKey: TranslationKey }[]

// Destructured so section ids come from the shared source (not re-typed
// literals) — also sidesteps useUniqueElementIds, which only flags literals.
const [overviewSection, projectSection, workSection, educationSection] =
  ABOUT_SECTIONS

// Slug → brand logo + official Simple Icons brand hue (verified against
// simpleicons.org, not memory). Slugs come from person.ts so the data file stays
// free of component imports; deriving the key union from there keeps this map
// exhaustive — add a tech in person.ts and TS forces its icon here. Brand hues
// are identity constants (not themeable), so they live here rather than as
// globals.css tokens.
type TechSlug = (typeof person.technologies)[number]["icon"]

const TECH_ICONS: Record<TechSlug, { Icon: IconType; color: string }> = {
  bash: { color: "#4EAA25", Icon: SiGnubash },
  git: { color: "#F03C2E", Icon: SiGit },
  javascript: { color: "#F7DF1E", Icon: SiJavascript },
  lua: { color: "#000080", Icon: SiLua },
  nix: { color: "#5277C3", Icon: SiNixos },
  python: { color: "#3776AB", Icon: SiPython },
  react: { color: "#61DAFB", Icon: SiReact },
  rust: { color: "#000000", Icon: SiRust },
  swift: { color: "#F05138", Icon: SiSwift },
  typescript: { color: "#3178C6", Icon: SiTypescript },
  vue: { color: "#4FC08D", Icon: SiVuedotjs },
}

// Every logo sits on a fixed light chip so its brand hue keeps the same contrast
// in any theme — Rust #000000 / Lua #000080 would vanish on a dark surface
// otherwise. Shared by the plain icons and the TS/JS flip card.
const ICON_PILL =
  "flex size-9 items-center justify-center rounded-full bg-green-50 shadow-sm ring-1 ring-black/5 transition hover:scale-110"

const SOCIAL_ICONS: Record<string, IconType> = {
  github: FaGithub,
  linkedin: FaLinkedin,
}

// One shared reveal, played as each block scrolls into view.
//TODO consider moving all motion variants to their own lib file
const reveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
} as const

function Section({
  id,
  title,
  children,
  className,
  reduced,
}: {
  id?: string
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Sets data-reduced, for sections whose CSS gates its own motion. */
  reduced?: boolean
}) {
  return (
    <motion.section
      className={cn("flex w-full scroll-mt-24 flex-col gap-6", className)}
      data-reduced={reduced}
      id={id}
      initial="hidden"
      transition={{ duration: 0.5, ease: "easeOut" }}
      variants={reveal}
      viewport={{ margin: "-80px", once: true }}
      whileInView="show"
    >
      {title}
      {children}
    </motion.section>
  )
}

// ---- Scroll-shrink logo ----------------------------------------------------
// The hero logo shrinks to a pinned badge on scroll and returns at the top.
// This is scroll-TRIGGERED, not scroll-linked: crossing a small threshold flips
// a boolean and a spring plays the full start↔end transition. The start and end
// states are therefore always identical regardless of how far you scroll, and it
// reverses once you're back within the leeway of the top.

const MIN_SCALE = 0.42 // resting size of the pinned badge
const LOGO_WIDTH = 180
const LOGO_HEIGHT = 220
// Shrink once scrolled past this; restore when back within it of the top.
const SCROLL_TRIGGER = 20

type HeroAnchor = { left: number; top: number }

// The fixed copy. Mounted only once its anchor is measured, so the resting
// (start) state lines up exactly with the in-flow logo it replaces.
function FloatingLogo({
  anchor,
  viewportWidth,
}: {
  anchor: HeroAnchor
  viewportWidth: number
}) {
  const { scrollY } = useScroll()
  const [shrunk, setShrunk] = useState(false)

  // Threshold trigger (not a scroll-linked scrub): flip state when crossing the
  // leeway. setState no-ops on an unchanged boolean, so this only re-renders on
  // an actual start↔end transition, not every scroll frame.
  useMotionValueEvent(scrollY, "change", (value) => {
    setShrunk(value > SCROLL_TRIGGER)
  })

  const targetY = 2
  const targetX = viewportWidth / 2 + 80

  // Portalled to <body>: a fixed element inside a transformed ancestor (the
  // sections reveal with a Motion `y` transform) is positioned against that
  // ancestor instead of the viewport, so while the reveal played the 400px
  // logo counted as page content and widened phones to ~537px.
  return createPortal(
    <motion.div
      animate={
        shrunk
          ? { scale: MIN_SCALE, x: targetX, y: targetY }
          : { scale: 1, x: anchor.left, y: anchor.top }
      }
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-30"
      initial={false}
      style={{ transformOrigin: "top left" }}
      transition={{ damping: 30, stiffness: 260, type: "spring" }}
    >
      <KangaFlowLogo />
    </motion.div>,
    document.body
  )
}

// Reserves the logo's footprint in the centered column (so nothing jumps) and
// hands the visible logo off to a fixed FloatingLogo once measured. Honours
// prefers-reduced-motion by rendering a plain, static logo.
function ScrollShrinkLogo({ className }: { className?: string }) {
  const spacerRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<HeroAnchor | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  // const [viewportHeight, setViewportHeight] = useState(0)
  const reduceMotion = useReducedMotion()

  // Layout effect, not a plain effect: until measured, the 400px logo sits
  // in-flow and sticks out past a phone's edge. A plain effect runs after
  // paint, so that frame (and a sideways scroll) was visible; measuring
  // before paint hands off to the fixed copy before anything is shown.
  useLayoutEffect(() => {
    if (reduceMotion) return
    const measure = () => {
      const el = spacerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setAnchor({ left: rect.left, top: rect.top })
      setViewportWidth(window.innerWidth)
      // setViewportHeight(window.innerHeight)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [reduceMotion])

  if (reduceMotion)
    return (
      <div className={className}>
        {" "}
        <KangaFlowLogo />{" "}
      </div>
    )

  return (
    <>
      <div
        className={className}
        ref={spacerRef}
        style={{ height: LOGO_HEIGHT, width: LOGO_WIDTH }}
      >
        {/* Visible in-flow until measured, then handed off to the fixed copy. */}
        {anchor ? null : <KangaFlowLogo />}
      </div>
      {anchor ? (
        <FloatingLogo anchor={anchor} viewportWidth={viewportWidth} />
      ) : null}
    </>
  )
}

function RubyName({ isJapanese }: { isJapanese: boolean }) {
  // My solution : (
  // const rubyNameLength = person.rubyName.length
  // const lastName = person.rubyName[
  //   rubyNameLength - 1
  // ] as (typeof person.rubyName)[3]
  // const rubyNameOrdered = isJapanese
  //   ? person.rubyName.filter((_part, index) => index !== rubyNameLength - 1)
  //   : [...person.rubyName]
  //   if (isJapanese) rubyNameOrdered.unshift(lastName)
  //   Ai's solution
  const rubyNameOrdered = isJapanese
    ? ([person.rubyName.at(-1), ...person.rubyName.slice(0, -1)] as Mutable<
        typeof person.rubyName
      >)
    : person.rubyName
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const [morphing, setMorphing] = useState(false)
  const [lead, setLead] = useState(0)

  // One running glyph index across all parts (stagger order); each part's
  // offset also drives when its furigana strip slides out.
  const lengths = rubyNameOrdered.map((part) => morphGlyphCount(part.romaji))
  const total = lengths.reduce((sum, n) => sum + n, 0)
  const offsets = lengths.map((_, i) =>
    lengths.slice(0, i).reduce((sum, n) => sum + n, 0)
  )

  // Hover AND keyboard focus run the same morph. If the avatar's slam is still
  // peaking, the name's entrance waits it out (exits are never delayed).
  function start() {
    setLead(reduced ? 0 : leadDelayMs(avatarEnteredAtTime(), performance.now()))
    setMorphing(true)
  }
  const stop = () => setMorphing(false)

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: presentational wrapper driving the decorative name morph; the h1 inside carries the text.
    <div
      className={cn(
        "hero-name ransom-on-page rounded-lg px-2 outline-none",
        "focus-visible:ring-tooltip-shadow focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-4",
        morphing && "morph-on",
        reduced && "hero-name--reduced"
      )}
      onBlur={stop}
      onFocus={start}
      onPointerEnter={start}
      onPointerLeave={stop}
      style={{ "--morph-lead": `${lead}ms` }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard parity, so the hover-only morph also plays on focus.
      tabIndex={0}
    >
      <h1 className="font-heading text-center text-3xl leading-relaxed font-semibold sm:text-4xl">
        {rubyNameOrdered.map((part, index) => (
          <motion.span
            className="inline-block"
            key={part.romaji}
            layout
            transition={{ damping: 50, stiffness: 200, type: "spring" }}
          >
            <ruby className="mx-1">
              <MorphText
                offset={offsets[index] ?? 0}
                text={part.romaji}
                total={total}
              />
              <rt
                className={cn(
                  "text-muted-foreground text-[0.4em]",
                  "ruby-furigana",
                  isJapanese ? "fade-in" : "fade-out"
                )}
                style={{ "--ps": offsets[index] ?? 0, "--total": total }}
              >
                {part.furigana}
              </rt>
            </ruby>
          </motion.span>
        ))}
      </h1>
    </div>
  )
}

// TypeScript ⇄ JavaScript: click flips the card to reveal the other language,
// matching the portfolio's SkillsContainer.
function FlipTechIcon({
  front,
  back,
}: {
  front: { name: string; Icon: IconType; color: string }
  back: { name: string; Icon: IconType; color: string }
}) {
  const {
    isJavascriptFlipTechIconFlipped,
    setIsJavascriptFlipTechIconFlipped,
  } = useGlobalStates()
  const shown = isJavascriptFlipTechIconFlipped ? back : front
  const Icon = shown.Icon

  return (
    <AnimatedTooltip label={shown.name}>
      <button
        aria-label={shown.name}
        className={cn(ICON_PILL, "perspective-[400px]")}
        onClick={() =>
          setIsJavascriptFlipTechIconFlipped(!isJavascriptFlipTechIconFlipped)
        }
        type="button"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            animate={{ opacity: 1, rotateY: 0 }}
            className="inline-flex"
            exit={{ opacity: 0, rotateY: 90 }}
            initial={{ opacity: 0, rotateY: -90 }}
            key={shown.name}
            style={{ color: shown.color }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Icon aria-hidden className="size-5" />
          </motion.span>
        </AnimatePresence>
      </button>
    </AnimatedTooltip>
  )
}

export function AboutSection() {
  const { locale, translate } = useLocale()
  const { markSocialVisited } = useAchievements()
  const {
    animationPref,
    isHelloEffectAnimationComplete,
    setIsHelloEffectAnimationComplete,
  } = useGlobalStates()
  const reducedMotion = isReducedMotion(animationPref, useReducedMotion())

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 py-8">
      {/* Identity — AnimatePresence keeps the intro mounted until its `exit`
          fade finishes; mode="wait" holds the content back until then so the
          min-h-screen intro and the page never stack during the swap. */}
      <AnimatePresence mode="wait">
        {!isHelloEffectAnimationComplete ? (
          <motion.div
            className="flex min-h-screen w-full items-center justify-center"
            exit={{ opacity: 0 }}
            key="intro"
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <AppleHelloIntro
              brand={translate("about.intro.brand")}
              locale={locale}
              onAnimationComplete={() =>
                setIsHelloEffectAnimationComplete(true)
              }
              speed={0.4}
              welcome={translate("about.intro.welcome")}
            />
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex w-full flex-col gap-16"
            initial={{ opacity: 0 }}
            key="content"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* overflow-x-clip: with reduced motion the 400px hero logo stays
                in-flow (no floating copy) and would widen phones to ~513px. */}
            <Section
              className="items-center overflow-x-clip text-center"
              id={overviewSection.id}
            >
              <div className="relative">
                <HeroAvatar />
                <ScrollShrinkLogo className="pointer-events-none absolute top-20 left-2" />
              </div>
              <RubyName isJapanese={locale === "ja"} />
              <LocaleTransition className="flex w-full flex-col items-center gap-6">
                <p className="text-muted-foreground text-sm">
                  <DecryptRole /> @ {person.workplace}
                </p>
                <div className="flex flex-col gap-2 text-sm/relaxed text-pretty">
                  {person.intro.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-1">
                  {person.technologies.map((tech) => {
                    // TypeScript and JavaScript each render as a flip card that reveals
                    // the other on click (front = self, back = the sibling language).
                    if (tech.icon === "javascript") {
                      return (
                        <FlipTechIcon
                          back={{
                            color: TECH_ICONS.typescript.color,
                            Icon: SiTypescript,
                            name: "TypeScript",
                          }}
                          front={{
                            color: TECH_ICONS.javascript.color,
                            Icon: SiJavascript,
                            name: tech.name,
                          }}
                          key={tech.name}
                        />
                      )
                    }
                    if (tech.icon === "typescript") {
                      return (
                        <FlipTechIcon
                          back={{
                            color: TECH_ICONS.javascript.color,
                            Icon: SiJavascript,
                            name: "JavaScript",
                          }}
                          front={{
                            color: TECH_ICONS.typescript.color,
                            Icon: SiTypescript,
                            name: tech.name,
                          }}
                          key={tech.name}
                        />
                      )
                    }
                    const { Icon, color } = TECH_ICONS[tech.icon]
                    return (
                      <AnimatedTooltip key={tech.name} label={tech.name}>
                        <span
                          aria-label={tech.name}
                          className={ICON_PILL}
                          role="img"
                          style={{ color }}
                        >
                          <Icon aria-hidden className="size-5" />
                        </span>
                      </AnimatedTooltip>
                    )
                  })}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {person.socials.map((social) => {
                    const Icon = SOCIAL_ICONS[social.icon] ?? Mail
                    return (
                      <Button asChild key={social.name} variant="secondary">
                        <a
                          href={social.href}
                          onClick={() => markSocialVisited(social.name)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Icon aria-hidden />
                          {social.name}
                        </a>
                      </Button>
                    )
                  })}
                </div>
              </LocaleTransition>
            </Section>
            <LocaleTransition className="flex w-full flex-col gap-16">
              {/* Project */}
              <Section
                id={projectSection.id}
                title={
                  <PageHeader
                    section={{
                      index: ABOUT_SECTIONS.indexOf(projectSection),
                      total: ABOUT_SECTIONS.length,
                    }}
                    subtitle={translate("about.projects.subtitle")}
                    title={translate("about.project")}
                  />
                }
              >
                <ProjectCards />
              </Section>
              {/* Work: a quest log (components/about/quest-log.tsx) */}
              <Section
                className="qa-scope"
                id={workSection.id}
                reduced={reducedMotion}
                title={
                  <PageHeader
                    section={{
                      index: ABOUT_SECTIONS.indexOf(workSection),
                      total: ABOUT_SECTIONS.length,
                    }}
                    title={translate("about.work")}
                  />
                }
              >
                <QuestLog reduced={reducedMotion} />
              </Section>
              {/* Education: the origin card with the piano */}
              <Section
                className="qa-scope"
                id={educationSection.id}
                reduced={reducedMotion}
                title={
                  <PageHeader
                    section={{
                      index: ABOUT_SECTIONS.indexOf(educationSection),
                      total: ABOUT_SECTIONS.length,
                    }}
                    title={translate("about.education")}
                  />
                }
              >
                <OriginCard reduced={reducedMotion} />
              </Section>
            </LocaleTransition>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
