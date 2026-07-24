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
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
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
import avatarSrc from "@/assets/avatar.png"
import { LocaleTransition } from "@/components/locale-transition"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GradientText } from "@/components/ui/gradient-text"
import type { TranslationKey } from "@/lib/i18n"
import { person } from "@/lib/person"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"
import "./about-section.css"
import { AppleHelloIntro } from "@/components/ui/apple-hello-effect"
import type { Mutable } from "@/lib/typescript-hooks/mutable"
import { useGlobalStates } from "@/providers/global-state-provider"
import { KangaFlowLogo } from "./ui/kangaflow-logo"
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
}: {
  id?: string
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.section
      className={cn("flex w-full scroll-mt-24 flex-col gap-6", className)}
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

function Avatar() {
  const [failed, setFailed] = useState(false)

  return (
    <div className="avatar-wrapper">
      <div className="avatar-polygon-container" />
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center font-heading font-medium text-muted-foreground text-xl">
          {`${person.firstName.at(0) ?? ""}${person.lastName.at(0) ?? ""}`}
        </span>
      ) : (
        <Image
          alt={person.firstName}
          className="avatar-img"
          height={300}
          onError={() => setFailed(true)}
          priority
          src={avatarSrc}
          width={150}
        />
      )}
    </div>
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
  const targetX = viewportWidth / 2 + 45

  return (
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
    </motion.div>
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

  useEffect(() => {
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
        {anchor ? null : <Avatar />}
      </div>
      {anchor ? (
        <FloatingLogo anchor={anchor} viewportWidth={viewportWidth} />
      ) : null}
    </>
  )
}

// Faithful port of the portfolio's React Bits "TrueFocus": non-focused words
// blur; a frame tracks the focused word; the first word swaps to `subtitleBlur`
// while blurred. Manual mode = hover / keyboard-focus a word.
function TrueFocus({
  subtitle,
  subtitleBlur,
  blurAmount = 4.5,
  animationDuration = 0.3,
}: {
  subtitle: string
  subtitleBlur: string
  blurAmount?: number
  animationDuration?: number
}) {
  const words = subtitle.split(" ")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [rect, setRect] = useState({ height: 0, width: 0, x: 0, y: 0 })

  useEffect(() => {
    const measure = () => {
      const el = wordRefs.current[currentIndex]
      const container = containerRef.current
      if (!el || !container) return
      const parent = container.getBoundingClientRect()
      const active = el.getBoundingClientRect()
      setRect({
        height: active.height,
        width: active.width,
        x: active.left - parent.left,
        y: active.top - parent.top,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [currentIndex])

  return (
    <div className="focus-container" ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex
        return (
          <button
            className={cn("focus-word", isActive && "active")}
            key={word}
            onBlur={() => setCurrentIndex(lastActiveIndex ?? 0)}
            onFocus={() => {
              setLastActiveIndex(index)
              setCurrentIndex(index)
            }}
            onPointerEnter={() => {
              setLastActiveIndex(index)
              setCurrentIndex(index)
            }}
            onPointerLeave={() => setCurrentIndex(lastActiveIndex ?? 0)}
            ref={(el) => {
              wordRefs.current[index] = el
            }}
            style={{ filter: isActive ? "blur(0px)" : `blur(${blurAmount}px)` }}
            type="button"
          >
            {index === 0 && !isActive ? subtitleBlur : word}
          </button>
        )
      })}
      <motion.div
        animate={{
          height: rect.height,
          opacity: rect.width ? 1 : 0,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        }}
        className="focus-frame"
        transition={{ duration: animationDuration }}
      >
        <span className="focus-corner top-left" />
        <span className="focus-corner top-right" />
        <span className="focus-corner bottom-left" />
        <span className="focus-corner bottom-right" />
      </motion.div>
    </div>
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
  return (
    <h1 className="text-center font-heading font-semibold text-3xl leading-relaxed sm:text-4xl">
      {rubyNameOrdered.map((part) => (
        <motion.span
          className="inline-block"
          key={part.romaji}
          layout
          transition={{ damping: 50, stiffness: 200, type: "spring" }}
        >
          <ruby className="mx-1">
            {part.romaji}
            <rt
              className={cn(
                "text-[0.4em] text-muted-foreground",
                "ruby-furigana",
                isJapanese ? "fade-in" : "fade-out"
              )}
            >
              {part.furigana}
            </rt>
          </ruby>
        </motion.span>
      ))}
    </h1>
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
  const { isHelloEffectAnimationComplete, setIsHelloEffectAnimationComplete } =
    useGlobalStates()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 py-8">
      {/* Identity */}
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
            onAnimationComplete={() => setIsHelloEffectAnimationComplete(true)}
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
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <Section className="items-center text-center" id={overviewSection.id}>
            <div className="relative">
              <Avatar />
              <ScrollShrinkLogo className="absolute top-20 left-2" />
            </div>
            <RubyName isJapanese={locale === "ja"} />
            <LocaleTransition className="flex w-full flex-col items-center gap-6">
              <p className="text-muted-foreground text-sm">
                {person.role} @ {person.workplace}
              </p>
              <div className="flex flex-col gap-2 text-pretty text-sm/relaxed">
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
                      <a href={social.href} rel="noreferrer" target="_blank">
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
              title={<GradientText neon text={translate("about.project")} />}
            >
              <p>test</p>
            </Section>
            {/* Work */}
            <Section
              id={workSection.id}
              title={
                <TrueFocus
                  subtitle={person.work.subtitle}
                  subtitleBlur={person.work.subtitleBlur}
                />
              }
            >
              {/* Technical skills — plain text, top of the résumé. */}
              <div className="flex flex-col gap-1">
                <h3 className="font-heading font-medium text-sm">
                  {translate("about.technical")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {person.technologies.map((tech) => tech.name).join(", ")}
                </p>
              </div>

              {person.work.experiences.map((job) => (
                <Card key={`${job.company}-${job.role}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{job.company}</CardTitle>
                    <CardDescription>
                      {job.role} · {job.timeframe}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex list-disc flex-col gap-2 pl-4 marker:text-muted-foreground">
                      {job.achievements.map((achievement) => (
                        <li key={achievement}>{achievement}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </Section>
            {/* Education */}
            <Section
              id={educationSection.id}
              title={
                <h2 className="font-heading font-semibold text-2xl sm:text-3xl">
                  {translate("about.education")}
                </h2>
              }
            >
              {person.studies.map((study) => (
                <Card key={study.name}>
                  <CardHeader>
                    <CardTitle className="text-base">{study.name}</CardTitle>
                    <CardDescription>{study.title}</CardDescription>
                  </CardHeader>
                  <CardContent>{study.description}</CardContent>
                </Card>
              ))}
            </Section>
          </LocaleTransition>
        </motion.div>
      )}
    </div>
  )
}
