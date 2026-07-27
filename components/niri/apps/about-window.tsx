"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { User } from "lucide-react"
import { person } from "@/lib/person"

// Compact "about me" card window. Reads plain `person` data (no i18n coupling)
// and scrolls its body so it fits any window size.

export function AboutWindow(): React.JSX.Element {
  const techNames = person.technologies.map((tech) => tech.name).join(", ")

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex items-center gap-2 border-border border-b bg-card px-4 py-3 text-card-foreground">
        <User aria-hidden className="size-5 text-muted-foreground" />
        <span className="font-heading font-semibold text-sm">About Me</span>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-semibold text-2xl text-foreground tracking-tight">
              {person.firstName} {person.lastName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {person.role} @ {person.workplace}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {person.intro.map((line) => (
              <p className="text-foreground text-sm leading-relaxed" key={line}>
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-1 border-border border-t pt-4">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Tech
            </span>
            <p className="text-foreground text-sm">{techNames}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
