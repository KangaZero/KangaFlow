export const ONEKO_COMMANDS = [
  "help",
  "toggle",
  "no-follow-cursor",
  "follow-cursor",
  "dog",
  "cat",
  "version",
] as const

const ONEKO_HELP: (readonly [
  cmd: (typeof ONEKO_COMMANDS)[number],
  desc: string,
])[] = [
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
