"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Tiny looping illustrations for the move drawer, one per move. The text in
// them is code, commands, proper nouns or endonyms (the hello-world-pp
// greetings are the point of that move), so it is deliberately not run
// through i18n. Motion is pure CSS, switched off by the drawer's
// [data-reduced="true"].

import { ArrowDownUp, Hand, MousePointerClick } from "lucide-react"
import { useEffect, useState } from "react"
import { CONTRIBUTIONS, type MoveId } from "@/lib/projects"
import { WEBMCP_TOOL_NAMES } from "@/lib/webmcp"

const GREETINGS = [
  "Hello!",
  "こんにちは",
  "まいど！",
  "Bonjour",
  "¡Hola!",
  "Привет",
  "안녕하세요",
] as const

const ENDONYMS = ["日本語", "Español", "Deutsch", "ไทย", "Rust", "C++20"]
const UPSTREAM = ["vite", "TanStack Query", "MDN", "neovim.io", "noogle"]

function Typed({ lines }: { lines: readonly string[] }) {
  return (
    <div className="md-demo-type">
      {lines.map((line, k) => (
        <div key={line} style={{ "--k": k }}>
          {line}
        </div>
      ))}
    </div>
  )
}

function Keys({ keys }: { keys: readonly React.ReactNode[] }) {
  return (
    <div className="md-demo-keys">
      {keys.map((key, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered; the same keycap ("a") can repeat.
        <kbd key={k} style={{ "--k": k }}>
          {key}
        </kbd>
      ))}
    </div>
  )
}

function Badges({ items, mark }: { items: readonly string[]; mark?: string }) {
  return (
    <div className="md-demo-badges">
      {items.map((item, k) => {
        const label = mark === undefined ? item : `${mark} ${item}`
        return (
          <span key={item} style={{ "--k": k }}>
            {label}
          </span>
        )
      })}
    </div>
  )
}

function Greeting({ animate }: { animate: boolean }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!animate) return
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % GREETINGS.length),
      1100
    )
    return () => window.clearInterval(id)
  }, [animate])
  return (
    <div className="md-demo-greet" key={index}>
      {GREETINGS[index]}
    </div>
  )
}

export function MoveDemo({ id, animate }: { id: MoveId; animate: boolean }) {
  switch (id) {
    case "tiling":
      return (
        <div aria-hidden className="md-demo-tiling">
          {["a", "b", "c", "d", "e"].map((key) => (
            <i key={key} />
          ))}
        </div>
      )
    case "terminal":
      return (
        <Typed
          lines={[
            "❯ nvim app/[lang]/page.tsx",
            "❯ ls components | head",
            "❯ cat lib/pages.ts",
          ]}
        />
      )
    case "agent":
      return <Badges items={WEBMCP_TOOL_NAMES.slice(0, 6)} />
    case "hjkl":
      return <Keys keys={["h", "j", "k", "l"]} />
    case "click":
      return (
        <Keys
          keys={[
            <MousePointerClick aria-hidden key="click" />,
            <ArrowDownUp aria-hidden key="scroll" />,
            <Hand aria-hidden key="drag" />,
          ]}
        />
      )
    case "marks":
      return <Keys keys={["m", "a", "'", "a"]} />
    case "greet":
      return <Greeting animate={animate} />
    case "snippet":
      return (
        <Typed lines={["fn main() {", '    println!("Hello, world!");', "}"]} />
      )
    case "list":
      return <Badges items={ENDONYMS} />
    case "maintainer":
      return <Badges items={CONTRIBUTIONS.nixpkgsMaintained} mark="❄" />
    case "bumps":
      return (
        <Typed
          lines={[
            "badkeys: 0.0.20 -> 0.0.22",
            "cutechess: 1.4.0 -> 1.5.1",
            "brows: init at 0.13",
          ]}
        />
      )
    case "upstream":
      return <Badges items={UPSTREAM} mark="✓" />
  }
}
