"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Home,
  Languages,
  LogOut,
  Moon,
  Sun,
  Terminal,
  Trophy,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import * as React from "react"

import { useLocale } from "@/components/locale-provider"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { LOCALES } from "@/lib/i18n"
import { THEMES, type Theme } from "@/lib/themes"

const THEME_ICON: Record<Theme, React.ComponentType> = {
  dark: Moon,
  light: Sun,
  terminal: Terminal,
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const router = useRouter()
  const { setTheme } = useTheme()
  const { locale, setLocale, translate } = useLocale()

  // ":" enters command mode (vim). Ignored while typing elsewhere so it never
  // hijacks a real colon in an input.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (event.key === ":" && !isTypingTarget(event.target)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const close = React.useCallback(() => {
    setOpen(false)
    setQuery("")
  }, [])

  // Close first, then run — so navigation/theme changes happen after unmount.
  const run = React.useCallback(
    (action: () => void) => {
      close()
      action()
    },
    [close]
  )

  // Typed ":q"/":quit" + Enter quits, mirroring vim's ex command.
  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const command = query.trim()
    if (event.key === "Enter" && (command === ":q" || command === ":quit")) {
      event.preventDefault()
      close()
    }
  }

  return (
    <CommandDialog
      className="data-closed:slide-out-to-top-8 data-open:slide-in-from-top-8 top-4 translate-y-0 font-mono sm:max-w-xl"
      description={translate("command.description")}
      onOpenChange={setOpen}
      open={open}
      showCloseButton
      title={translate("command.title")}
    >
      <CommandInput
        onKeyDown={onInputKeyDown}
        onValueChange={setQuery}
        placeholder={translate("command.placeholder")}
        value={query}
      />
      <CommandList>
        <CommandEmpty>{translate("command.empty")}</CommandEmpty>

        <CommandGroup heading={translate("command.groups.theme")}>
          {THEMES.map((theme) => {
            const Icon = THEME_ICON[theme]
            return (
              <CommandItem
                key={theme}
                onSelect={() => run(() => setTheme(theme))}
                value={`theme ${theme}`}
              >
                <Icon />
                {translate(`theme.${theme}`)}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading={translate("command.groups.navigation")}>
          <CommandItem
            onSelect={() => run(() => router.push(`/${locale}`))}
            value="home"
          >
            <Home />
            {translate("nav.home")}
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => router.push(`/${locale}/achievements`))}
            value="achievements"
          >
            <Trophy />
            {translate("nav.achievements")}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading={translate("command.groups.locale")}>
          {LOCALES.map((code) => (
            <CommandItem
              key={code}
              onSelect={() => run(() => setLocale(code))}
              value={`locale ${code}`}
            >
              <Languages />
              {translate(`command.locales.${code}`)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={translate("command.groups.general")}>
          <CommandItem
            keywords={[":q", ":quit", "exit"]}
            onSelect={close}
            value="quit"
          >
            <LogOut />
            {translate("command.quit")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
