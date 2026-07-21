"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Mail } from "lucide-react"
import { motion } from "motion/react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import type { IconType } from "react-icons"
import { FaGithub, FaLinkedin } from "react-icons/fa6"
import {
  SiGit,
  SiGnubash,
  SiGo,
  SiJavascript,
  SiNixos,
  SiReact,
  SiRust,
  SiTypescript,
  SiVim,
  SiVuedotjs,
} from "react-icons/si"

import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { person } from "@/lib/person"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"
import "./about-section.css"

// Slug → brand logo. Slugs come from person.ts so the data file stays free of
// component imports.
const TECH_ICONS: Record<string, IconType> = {
  bash: SiGnubash,
  git: SiGit,
  go: SiGo,
  javascript: SiJavascript,
  nixos: SiNixos,
  react: SiReact,
  rust: SiRust,
  typescript: SiTypescript,
  vim: SiVim,
  vue: SiVuedotjs,
}

const SOCIAL_ICONS: Record<string, IconType> = {
  github: FaGithub,
  linkedin: FaLinkedin,
}

// One shared reveal, played as each block scrolls into view.
const reveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
} as const

function Section({
  title,
  children,
  className,
}: {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.section
      className={cn("flex w-full flex-col gap-6", className)}
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
          src={person.avatar}
          width={150}
        />
      )}
    </div>
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
  return (
    <h1 className="text-center font-heading font-semibold text-3xl leading-relaxed sm:text-4xl">
      {person.rubyName.map((part) => (
        <ruby className="mx-1" key={part.romaji}>
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
      ))}
    </h1>
  )
}

export function AboutSection() {
  const { locale, translate } = useLocale()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 py-8">
      {/* Identity */}
      <Section className="items-center text-center">
        <Avatar />
        <RubyName isJapanese={locale === "ja"} />
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
            const Icon = TECH_ICONS[tech.icon]
            if (!Icon) return null
            return (
              <AnimatedTooltip key={tech.name} label={tech.name}>
                <span
                  aria-label={tech.name}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted",
                    tech.category === "professional"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                  role="img"
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
      </Section>

      {/* Work */}
      <Section
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
    </div>
  )
}
