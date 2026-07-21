"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Mail } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import type { IconType } from "react-icons"
import { FaGithub, FaLinkedin } from "react-icons/fa6"

import { Button } from "@/components/ui/button"
import { person } from "@/lib/person"

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

export function SiteFooter() {
  const year = new Date().getFullYear()
  const followers = useGithubFollowers(person.githubUsername)

  return (
    <footer className="mt-16 flex w-full flex-col items-center gap-4 border-border/60 border-t py-6 text-muted-foreground text-xs sm:flex-row sm:justify-between">
      <p suppressHydrationWarning>
        © {year} <span className="text-foreground">{person.name}</span> /
        KangaWorks
      </p>

      <div className="flex items-center gap-1">
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
              <a href={social.href} rel="noreferrer" target="_blank">
                <Icon aria-hidden />
                {isGithub && followers !== null && (
                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-emerald-500"
                    />
                    {followers}
                  </span>
                )}
              </a>
            </Button>
          )
        })}
        <Image
          alt="KangaZero"
          className="ml-2 h-5 w-auto opacity-80 terminal:invert dark:invert"
          height={20}
          src="/trademarks/kanga-zero.svg"
          width={90}
        />
      </div>
    </footer>
  )
}
