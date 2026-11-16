import type { AchievementId } from "@/lib/achievements"
import { ONEKO_VERSION } from "@/lib/oneko"
import { PAGE, type PageName } from "@/lib/pages"

export const ONEKO_COMMANDS = [
  "help",
  "toggle",
  "no-follow-cursor",
  "follow-cursor",
  "dog",
  "cat",
  "version",
] as const

export type OnekoCommand = (typeof ONEKO_COMMANDS)[number]

const ONEKO_HELP: (readonly [cmd: OnekoCommand, desc: string])[] = [
  ["toggle", "summon or dismiss oneko-sama"],
  ["no-follow-cursor", "tsundere oneko-sama"],
  ["follow-cursor", "yandere oneko-sama"],
  ["dog", "the wrong choice"],
  ["cat", "oneko-sama"],
  ["version", "prints out the version"],
]

// \x1b[38;5;214m is 256-colour orange — distinct from the yellow \x1b[33m used
// elsewhere, so the warning reads as a caution-level notice at a glance.
export const onekoReduceMotionWarning = (): string =>
  `\r\n\x1b[38;5;214m! reduced motion is enabled — oneko will not show\x1b[0m`

export const onekoHelp = (showUsageLine: boolean): string => {
  const pad = ONEKO_HELP.reduce((n, [cmd]) => Math.max(n, cmd.length), 0)
  const rows = ONEKO_HELP.map(
    ([cmd, desc]) =>
      `  \x1b[1;35m${cmd.padEnd(pad)}\x1b[0m  \x1b[90m${desc}\x1b[0m`
  )
  const addToStart = showUsageLine ? `\r\nusage: oneko <subcmd>` : ""
  return `${addToStart}\r\n\x1b[1mCommands\x1b[0m\r\n${rows.join("\r\n")}`
}

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Everything below is the pure core of the `oneko` command: parse → transition
// → render. terminal-body only applies the result (setters, achievement unlock,
// exit code, term.write), so the behaviour is unit-testable without xterm/React.

export function isOnekoCommand(value: string): value is OnekoCommand {
  return (ONEKO_COMMANDS as readonly string[]).includes(value)
}

// The only page that mounts <Neko /> (app/[lang]/environment/page.tsx). Typed
// as PageName and read from PAGE so a renamed route fails the build here.
export const ONEKO_HOME_PAGE: PageName = PAGE.environment.name

// The persisted oneko preferences (see GlobalStatesContextValue).
export type OnekoState = {
  enabled: boolean
  followCursor: boolean
}

export type OnekoOutput =
  | { kind: "help" }
  | { kind: "unknown"; input: string }
  | { kind: "summoned" }
  | { kind: "dismissed" }
  | { kind: "follow-cursor"; changed: boolean }
  | { kind: "no-follow-cursor"; changed: boolean }
  | { kind: "cat" }
  | { kind: "dog" }
  | { kind: "version" }

export type OnekoResult = {
  next: OnekoState
  output: OnekoOutput
  exitCode: 0 | 1
  // Dismissing oneko-sama is unforgivable, and remembered.
  unlock: Extract<AchievementId, "psychopath"> | null
}

const ok = (next: OnekoState, output: OnekoOutput): OnekoResult => ({
  exitCode: 0,
  next,
  output,
  unlock: null,
})

// Pure transition: the raw argument string (untrusted user input) + current
// state → the next state and what to print. Unknown/empty input never changes
// state; an unknown subcommand is the only non-zero exit.
export function applyOnekoCommand(
  state: OnekoState,
  rawArg: string
): OnekoResult {
  const arg = rawArg.trim()
  if (arg === "") {
    return ok(state, { kind: "help" })
  }
  if (!isOnekoCommand(arg)) {
    return { ...ok(state, { input: arg, kind: "unknown" }), exitCode: 1 }
  }
  switch (arg) {
    case "help":
      return ok(state, { kind: "help" })
    case "toggle":
      return state.enabled
        ? {
            ...ok({ ...state, enabled: false }, { kind: "dismissed" }),
            unlock: "psychopath",
          }
        : ok({ ...state, enabled: true }, { kind: "summoned" })
    case "follow-cursor":
      return ok(
        { ...state, followCursor: true },
        { changed: !state.followCursor, kind: "follow-cursor" }
      )
    case "no-follow-cursor":
      return ok(
        { ...state, followCursor: false },
        { changed: state.followCursor, kind: "no-follow-cursor" }
      )
    case "cat":
      return ok(state, { kind: "cat" })
    case "dog":
      return ok(state, { kind: "dog" })
    case "version":
      return ok(state, { kind: "version" })
    default: {
      const unreachable: never = arg
      return unreachable
    }
  }
}

// Plain ASCII only: the terminal font is a latin subset rendered by xterm's DOM
// renderer, so box-drawing/block glyphs would fall back to a wider font.
const ASCII_CAT = [" /\\_/\\ ", "( o.o )", " > ^ < "] as const

const line = (text: string): string => `\r\n${text}`
const magenta = (text: string): string => `\x1b[1;35m${text}\x1b[0m`
const dim = (text: string): string => `\x1b[90m${text}\x1b[0m`

// Render an outcome as xterm output (leading \r\n per line, like the rest of
// the shell). `atHome` = the terminal is on the page where the cat lives.
export function renderOnekoOutput(
  output: OnekoOutput,
  atHome: boolean
): string {
  switch (output.kind) {
    case "help":
      return onekoHelp(true)
    case "unknown":
      return `${line(`oneko: unknown subcommand: ${output.input}`)}${onekoHelp(true)}`
    case "summoned":
      return `${line(`\x1b[32moneko-sama has been summoned. nya~\x1b[0m`)}${
        atHome ? "" : line(dim(`oneko-sama awaits you on /${ONEKO_HOME_PAGE}`))
      }`
    case "dismissed":
      return line("\x1b[1;31mHow could you!\x1b[0m")
    case "follow-cursor":
      return output.changed
        ? line(magenta("oneko-sama will follow you. forever. (yandere mode)"))
        : line(dim("oneko-sama is already following you"))
    case "no-follow-cursor":
      return output.changed
        ? line(
            magenta(
              "it's not like oneko-sama wanted to follow you anyway! (tsundere mode)"
            )
          )
        : line(dim("oneko-sama is already ignoring you"))
    case "cat":
      return `${ASCII_CAT.map((row) => line(magenta(row))).join("")}${line(
        "yes. oneko-sama is the cat."
      )}`
    case "dog":
      return line(
        "\x1b[33moneko: the wrong choice. there is no dog. there will never be a dog.\x1b[0m"
      )
    case "version":
      return line(`oneko ${ONEKO_VERSION}`)
    default: {
      const unreachable: never = output
      return unreachable
    }
  }
}
