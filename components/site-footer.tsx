"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Mail } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { IconType } from "react-icons"
import { FaGithub, FaLinkedin } from "react-icons/fa6"

import { Button } from "@/components/ui/button"
import { withBasePath } from "@/lib/base-path"
import { hrefForRoute, PAGE, type PageName } from "@/lib/pages"
import { person } from "@/lib/person"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

const SOCIAL_ICONS: Record<string, IconType> = {
  github: FaGithub,
  linkedin: FaLinkedin,
}

// Live GitHub follower count. Fetched client-side (static export has no server),
// mirroring how weather is fetched. Fails silently → count just stays hidden.
function useGithubFollowers(username: string) {
  const [followers, setFollowers] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`https://api.github.com/users/${username}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "followers" in data &&
          typeof data.followers === "number"
        ) {
          setFollowers(data.followers)
        }
      })
      .catch(() => {
        /* offline / rate-limited — leave count hidden */
      })
    return () => controller.abort()
  }, [username])

  return followers
}

// Same order as the header dock. Typed against PageName, so a renamed or
// removed page fails the build here instead of linking nowhere.
const FOOTER_PAGES = [
  "home",
  "achievements",
  "timeline",
  "environment",
] as const satisfies readonly PageName[]

export function SiteFooter() {
  const year = new Date().getFullYear()
  const followers = useGithubFollowers(person.githubUsername)
  const { markSocialVisited } = useAchievements()
  const { locale, translate } = useLocale()

  // Three columns on sm+ (legal · site nav · socials), stacked and centred on
  // mobile. The outer columns are 1fr each so the nav sits truly centred.
  return (
    <footer className="border-border/60 text-muted-foreground mt-16 w-full border-t pt-6 pb-28 text-xs sm:pb-6">
      <div className="mx-auto grid max-w-5xl grid-cols-1 justify-items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:justify-items-stretch">
        <p suppressHydrationWarning>
          © {year} <span className="text-foreground">{person.name}</span> /
          KangaWorks
        </p>

        <nav aria-label={translate("nav.footer")}>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {FOOTER_PAGES.map((name) => (
              <li key={name}>
                <Link
                  className="hover:text-foreground focus-visible:text-foreground transition-colors"
                  href={hrefForRoute(locale, PAGE[name].route)}
                >
                  {translate(`nav.${name}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:justify-self-end">
          {person.socials.map((social) => {
            const Icon = SOCIAL_ICONS[social.icon] ?? Mail
            const isGithub = social.icon === "github"
            return (
              <Button
                aria-label={social.name}
                asChild
                key={social.name}
                size="sm"
                variant="ghost"
              >
                <a
                  href={social.href}
                  onClick={() => markSocialVisited(social.name)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon aria-hidden />
                  {isGithub && followers !== null && (
                    <span className="inline-flex items-center gap-1">
                      <span
                        aria-hidden
                        className="bg-primary size-1.5 rounded-full"
                      />
                      {followers}
                    </span>
                  )}
                </a>
              </Button>
            )
          })}
          {/* KangaZero mark in its own teal→pink gradient (no invert: inverting
              the colours turned it muddy red on dark). The SVG has wide
              padding, hence h-8. Dims at rest, lifts on hover. */}
          <Image
            alt="KangaZero"
            className="ml-1 h-8 w-auto opacity-75 transition duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:opacity-100 motion-reduce:transition-none motion-reduce:hover:transform-none"
            height={32}
            src={withBasePath("/trademarks/kanga-zero.svg")}
            width={64}
          />
        </div>
      </div>
    </footer>
  )
}
