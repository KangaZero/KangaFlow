"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Plus,
  RotateCw,
  Star,
  X,
} from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// Bookmarks persist across sessions (localStorage).
const STORAGE_KEY = "kangaflow:niri-bookmarks"

function loadBookmarks(): string[] {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(parsed)
      ? parsed.filter((u): u is string => typeof u === "string")
      : []
  } catch {
    return []
  }
}

// Short label for a bookmark/tab chip.
function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname
  } catch {
    return raw
  }
}

// A real (sandboxed) browser tab. Loads pages in an <iframe sandbox> — the
// portfolio's live site frames fine; note many external sites send
// X-Frame-Options and refuse to load. Cross-origin frames hide their own
// history, so back/forward track OUR navigations here (per tab) and reload
// remounts the frame (nonce bump). In-page link clicks inside the frame
// aren't tracked.

const FALLBACK_URL = "https://kangazero.github.io/KangaFlow/"

// Same-origin home of the CURRENT instance (dev localhost or the live Pages
// deploy), derived from the environment page's own URL minus the trailing
// /environment. Same-origin frames cleanly (no X-Frame-Options gamble).
function currentHome(): string {
  if (typeof window === "undefined") return FALLBACK_URL
  const { origin, pathname } = window.location
  return `${origin}${pathname.replace(/\/environment\/?$/, "")}`
}

// Bare input → a loadable URL: keep http(s) as-is, otherwise assume https.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === "") return currentHome()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

// One browser tab: its own history stack + cursor (so back/forward are
// per-tab), plus a nonce that remounts just this tab's iframe on reload.
type Tab = {
  id: string
  history: string[]
  index: number
  nonce: number
}

function makeTab(url: string): Tab {
  return { history: [url], id: crypto.randomUUID(), index: 0, nonce: 0 }
}

const TOOLBAR_BUTTON =
  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"

export function BrowserWindow(): React.JSX.Element {
  const { translate } = useLocale()
  const initialTab = useMemo(() => makeTab(currentHome()), [])
  const [tabs, setTabs] = useState<Tab[]>(() => [initialTab])
  const [activeId, setActiveId] = useState<string>(() => initialTab.id)
  const [address, setAddress] = useState(currentHome)
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks)

  // Combobox (address suggestions) state.
  const [comboOpen, setComboOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]
  const url = activeTab
    ? (activeTab.history[activeTab.index] ?? FALLBACK_URL)
    : FALLBACK_URL
  const canBack = activeTab ? activeTab.index > 0 : false
  const canForward = activeTab
    ? activeTab.index < activeTab.history.length - 1
    : false
  const isBookmarked = bookmarks.includes(url)

  // Frame-friendly starting points (sites that don't send X-Frame-Options).
  const suggestions = useMemo(
    () => [
      { label: translate("environment.apps.about.name"), url: currentHome() },
      { label: "Wikipedia", url: "https://en.wikipedia.org" },
      { label: "example.com", url: "https://example.com" },
      {
        label: "First website (CERN)",
        url: "https://info.cern.ch/hypertext/WWW/TheProject.html",
      },
    ],
    [translate]
  )

  // Persist favourites whenever they change.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  }, [bookmarks])

  const updateActive = (fn: (t: Tab) => Tab): void =>
    setTabs((ts) => ts.map((t) => (t.id === activeId ? fn(t) : t)))

  const navigate = (to: string): void => {
    const next = normalizeUrl(to)
    updateActive((t) => ({
      ...t,
      history: [...t.history.slice(0, t.index + 1), next],
      index: t.index + 1,
    }))
    setAddress(next)
    setComboOpen(false)
  }

  const step = (delta: number): void => {
    if (!activeTab) return
    const target = activeTab.index + delta
    const entry = activeTab.history[target]
    if (entry === undefined) return
    updateActive((t) => ({ ...t, index: target }))
    setAddress(entry)
  }

  const reload = (): void => updateActive((t) => ({ ...t, nonce: t.nonce + 1 }))

  const newTab = (): void => {
    const tab = makeTab(currentHome())
    setTabs((ts) => [...ts, tab])
    setActiveId(tab.id)
    setAddress(currentHome())
  }

  const switchTab = (id: string): void => {
    setActiveId(id)
    const tab = tabs.find((t) => t.id === id)
    if (tab) setAddress(tab.history[tab.index] ?? currentHome())
    setComboOpen(false)
  }

  const closeTab = (id: string): void => {
    if (tabs.length <= 1) return
    const idx = tabs.findIndex((t) => t.id === id)
    const next = tabs.filter((t) => t.id !== id)
    setTabs(next)
    if (id === activeId) {
      const neighbour = next[Math.min(idx, next.length - 1)]
      if (neighbour) {
        setActiveId(neighbour.id)
        setAddress(neighbour.history[neighbour.index] ?? currentHome())
      }
    }
  }

  const toggleBookmark = (): void =>
    setBookmarks((bm) =>
      bm.includes(url) ? bm.filter((u) => u !== url) : [...bm, url]
    )

  // Combobox options: a "go to typed" row (when the address was edited), then
  // suggestions + bookmarks, filtered by the typed text.
  const typing = address.trim() !== url
  const needle = address.trim().toLowerCase()
  const match = (label: string, target: string): boolean =>
    !typing ||
    needle === "" ||
    label.toLowerCase().includes(needle) ||
    target.toLowerCase().includes(needle)

  type Option = { key: string; label: string; sublabel: string; url: string }
  const options: Option[] = [
    ...(typing && address.trim() !== ""
      ? [
          {
            key: "go",
            label: address.trim(),
            sublabel: translate("environment.browser.address"),
            url: address,
          },
        ]
      : []),
    ...suggestions
      .filter((s) => match(s.label, s.url))
      .map((s) => ({
        key: `s:${s.url}`,
        label: s.label,
        sublabel: translate("environment.browser.suggestions"),
        url: s.url,
      })),
    ...bookmarks
      .filter((b) => match(hostOf(b), b))
      .map((b) => ({
        key: `b:${b}`,
        label: hostOf(b),
        sublabel: translate("environment.browser.bookmarks"),
        url: b,
      })),
  ]
  const boundedHighlight = Math.min(highlight, Math.max(0, options.length - 1))

  const openCombo = (): void => {
    setComboOpen(true)
    setHighlight(0)
  }

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      {/* Tab strip */}
      <div className="flex items-center gap-1 overflow-x-auto border-border border-b bg-card px-2 py-1">
        {tabs.map((t) => {
          const tabUrl = t.history[t.index] ?? FALLBACK_URL
          const active = t.id === activeId
          return (
            <div
              className={cn(
                "group flex shrink-0 items-center gap-1 rounded-md py-1 pr-1 pl-2 text-xs transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
              key={t.id}
            >
              <button
                className="flex items-center gap-1.5"
                onClick={() => switchTab(t.id)}
                type="button"
              >
                <Globe aria-hidden className="size-3" />
                <span className="max-w-28 truncate">{hostOf(tabUrl)}</span>
              </button>
              {tabs.length > 1 ? (
                <button
                  aria-label={translate("environment.browser.closeTab")}
                  className="rounded p-0.5 opacity-0 transition-opacity hover:bg-background/60 group-hover:opacity-100"
                  onClick={() => closeTab(t.id)}
                  type="button"
                >
                  <X aria-hidden className="size-3" />
                </button>
              ) : null}
            </div>
          )
        })}
        <button
          aria-label={translate("environment.browser.newTab")}
          className={cn(TOOLBAR_BUTTON, "shrink-0")}
          onClick={newTab}
          type="button"
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-border border-b bg-card px-3 py-2 text-card-foreground">
        <div className="flex items-center gap-1">
          <button
            aria-label={translate("environment.browser.back")}
            className={TOOLBAR_BUTTON}
            disabled={!canBack}
            onClick={() => step(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button
            aria-label={translate("environment.browser.forward")}
            className={TOOLBAR_BUTTON}
            disabled={!canForward}
            onClick={() => step(1)}
            type="button"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
          <button
            aria-label={translate("environment.browser.reload")}
            className={TOOLBAR_BUTTON}
            onClick={reload}
            type="button"
          >
            <RotateCw aria-hidden className="size-4" />
          </button>
        </div>

        {/* Address combobox */}
        <div className="relative min-w-0 flex-1">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const chosen = options[boundedHighlight]
              navigate(comboOpen && chosen ? chosen.url : address)
            }}
          >
            <input
              aria-activedescendant={
                comboOpen && options[boundedHighlight]
                  ? `${listboxId}-${boundedHighlight}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={comboOpen}
              aria-label={translate("environment.browser.address")}
              className="w-full truncate rounded-full border border-border bg-muted px-3 py-1.5 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onBlur={() => setComboOpen(false)}
              onChange={(event) => {
                setAddress(event.target.value)
                openCombo()
              }}
              onFocus={(event) => {
                event.target.select()
                openCombo()
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setComboOpen(true)
                  setHighlight((h) => Math.min(h + 1, options.length - 1))
                } else if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setHighlight((h) => Math.max(h - 1, 0))
                } else if (event.key === "Escape") {
                  setComboOpen(false)
                }
              }}
              ref={inputRef}
              role="combobox"
              spellCheck={false}
              value={address}
            />
          </form>

          {comboOpen && options.length > 0 ? (
            <div
              className="absolute top-full right-0 left-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
              id={listboxId}
              role="listbox"
            >
              {options.map((option, i) => (
                <div
                  aria-selected={i === boundedHighlight}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                    i === boundedHighlight && "bg-accent text-accent-foreground"
                  )}
                  id={`${listboxId}-${i}`}
                  key={option.key}
                  onMouseDown={(event) => {
                    // Navigate before the input blurs (which would close this).
                    event.preventDefault()
                    navigate(option.url)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  role="option"
                  tabIndex={-1}
                >
                  {option.key === "go" ? (
                    <Globe aria-hidden className="size-3.5 shrink-0" />
                  ) : (
                    <Star aria-hidden className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{option.label}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                    {option.sublabel}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <button
          aria-label={translate("environment.browser.bookmark")}
          aria-pressed={isBookmarked}
          className={cn(
            TOOLBAR_BUTTON,
            isBookmarked ? "text-yellow-500" : "hover:text-yellow-500"
          )}
          onClick={toggleBookmark}
          type="button"
        >
          <Star
            aria-hidden
            className={cn("size-4", isBookmarked && "fill-current")}
          />
        </button>
      </div>

      {bookmarks.length > 0 ? (
        <div className="flex items-center gap-1 overflow-x-auto border-border border-b bg-card px-3 py-1.5">
          {bookmarks.map((bm) => (
            <button
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              key={bm}
              onClick={() => navigate(bm)}
              title={bm}
              type="button"
            >
              <Star
                aria-hidden
                className="size-3 fill-current text-yellow-500"
              />
              <span className="max-w-32 truncate">{hostOf(bm)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* One iframe per tab; inactive tabs stay mounted (hidden) so their page
          state survives a tab switch. */}
      <div className="relative min-h-0 w-full flex-1 bg-background">
        {tabs.map((t) => (
          <iframe
            className={cn(
              "absolute inset-0 h-full w-full border-0 bg-background",
              t.id !== activeId && "hidden"
            )}
            key={`${t.id}-${t.nonce}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            src={t.history[t.index] ?? FALLBACK_URL}
            title={translate("environment.apps.browser.name")}
          />
        ))}
      </div>
    </div>
  )
}
