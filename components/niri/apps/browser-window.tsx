"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { ArrowLeft, ArrowRight, RotateCw, Star } from "lucide-react"

// Mock Firefox-ish browser chrome. Purely presentational: the toolbar buttons,
// address bar, and start-page links are decorative (no navigation, no iframe).

const START_PAGE_LINKS = ["Home", "Achievements", "Timeline"] as const

export function BrowserWindow(): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex items-center gap-2 border-border border-b bg-card px-3 py-2 text-card-foreground">
        <div className="flex items-center gap-1">
          <button
            aria-label="Back"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            type="button"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button
            aria-label="Forward"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            type="button"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
          <button
            aria-label="Reload"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            type="button"
          >
            <RotateCw aria-hidden className="size-4" />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center rounded-full border border-border bg-muted px-3 py-1.5 text-muted-foreground text-sm">
          <span className="truncate">kangazero.github.io/KangaFlow</span>
        </div>
        <button
          aria-label="Bookmark"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          type="button"
        >
          <Star aria-hidden className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="font-heading font-semibold text-4xl text-foreground tracking-tight">
          KangaFlow
        </h1>
        <p className="max-w-md text-muted-foreground text-sm">
          A web niri desktop portfolio — tile, resize, and explore.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {START_PAGE_LINKS.map((label) => (
            <a
              className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
              href={`#${label.toLowerCase()}`}
              key={label}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
