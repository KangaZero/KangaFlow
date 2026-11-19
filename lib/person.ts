// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { getLocalTimeZone } from "@/lib/timezone"

// Single source of truth for personal / about content, ported verbatim from the
// portfolio's `person` + `about` i18n dictionaries. Prose lives here as data
// (not i18n keys) by design decision; only the section labels go through i18n.
export const person = {
  avatar: "/images/avatar.png",
  email: "samuelyongw@gmail.com",
  firstName: "Samuel Wai Weng",
  githubUsername: "KangaZero",

  // Intro paragraphs shown under the name (verbatim from about.intro).
  intro: [
    "Senior Frontend Developer specialized in React and TypeScript.",
    "Also works with: Swift, Lua, Nix, Rust, Python",
  ],
  lastName: "Yong",

  // IANA time zone (falls back to Asia/Tokyo); used for the weather forecast.
  location: getLocalTimeZone(),
  // [latitude, longitude] for Tokyo.
  locationCoordinates: [35.660504, 139.724981],
  name: "Samuel Wai Weng Yong",

  // Portfolio projects surfaced in the About "Project" carousel. Descriptions
  // live here as data (same call as intro/work/studies above); only the link
  // button labels go through i18n. `kind` maps to an icon + i18n label in
  // about-section; project names are proper nouns and stay literal.
  projects: [
    {
      description:
        "Vim motions for your mouse on macOS — a menu-bar daemon that drives the cursor, clicks, scrolls, and gestures straight from hjkl. Modal, count-aware, mark- and register-backed.",
      links: [
        { href: "https://kangazero.github.io/neomouse/", kind: "website" },
        { href: "https://github.com/KangaZero/neomouse", kind: "repo" },
      ],
      name: "neomouse",
    },
    {
      description:
        "A satirical jab at per-token AI billing: flaunt how much AI you burn through and “donate” ever more to the top 0.01%.",
      links: [
        {
          href: "https://kangazero.github.io/tokenmaxxingman/",
          kind: "website",
        },
        { href: "https://github.com/KangaZero/tokenmaxxingman", kind: "repo" },
      ],
      name: "tokenmaxxing",
    },
  ],

  role: "Frontend Developer",
  // Hero easter egg: hovering/clicking the first word of `role` decrypts it
  // into this, upside down.
  roleFlip: "Backend",

  // Romaji + furigana (+ optional kanji) per name part. The About header fades
  // the furigana in on the Japanese locale and out on English.
  rubyName: [
    { furigana: "サムエル", kanji: "", romaji: "Samuel" },
    { furigana: "ワイ", kanji: "偉", romaji: "Wai" },
    { furigana: "ウエング", kanji: "栄", romaji: "Weng" },
    { furigana: "ヨング", kanji: "楊", romaji: "Yong" },
  ],

  // External links surfaced as buttons in the About header + footer. `icon` is a
  // slug the components map to a react-icons component.
  socials: [
    { href: "https://github.com/KangaZero", icon: "github", name: "GitHub" },
    {
      href: "https://www.linkedin.com/in/samuel-wai-weng-yong-4a6874194/",
      icon: "linkedin",
      name: "LinkedIn",
    },
    { href: "mailto:samuelyongw@gmail.com", icon: "email", name: "Email" },
  ],

  // Education (verbatim from about.studies).
  studies: [
    {
      description:
        "Majored in Classical Piano, minored in Fullstack Web Development",
      name: "University of Sydney",
      title: "Bachelor of Arts",
    },
  ],

  // Tech surfaced as brand logos. `icon` is a Simple Icons slug (react-icons/si);
  // `category` drives the styling accent.
  technologies: [
    { category: "professional", icon: "typescript", name: "TypeScript" },
    { category: "professional", icon: "javascript", name: "JavaScript" },
    { category: "professional", icon: "react", name: "React" },
    { category: "professional", icon: "git", name: "Git" },
    { category: "professional", icon: "bash", name: "Bash" },
    { category: "hobby", icon: "vue", name: "Vue" },
    { category: "hobby", icon: "swift", name: "Swift" },
    { category: "hobby", icon: "lua", name: "Lua" },
    { category: "hobby", icon: "nix", name: "Nix" },
    { category: "hobby", icon: "rust", name: "Rust" },
    { category: "hobby", icon: "python", name: "Python" },
    // { category: "professional", icon: "vim", name: "Vim" },
  ],

  // Work section (rendered as a quest log in components/about/quest-log.tsx).
  // `kind` picks the MAIN / SIDE QUEST tag, `current` the blinking IN
  // PROGRESS (vs a CLEAR! stamp), `pitch` the plain one-liner shown on the
  // closed panel; `logo` keys the employer mark.
  work: {
    experiences: [
      {
        achievements: [
          "Chat: streamed replies, syntax-highlighted code, a model picker and live views of what the agent and its helpers are doing.",
          "Canvas: preview and edit HTML, Mermaid and BPMN files right beside the chat, sandboxed so nothing in a file can touch the app.",
          "Team spaces: a file explorer, shared skills, a knowledge library and an admin console for teams, roles and usage.",
          "First-run polish: guided tours of every main feature, a friendly welcome, and one accessible table used across the app.",
          "Beyond the UI: wired it to internal AI and DevOps platforms, helped move it to Azure, and hardened it with strict security headers and sandboxing.",
        ],
        company: "Accenture",
        current: true,
        kind: "main",
        logo: "accenture",
        pitch:
          "I build an internal web app where teams work with an AI coding agent in the browser: chat with it, watch it work, and review what it changes. Mostly frontend, plus the glue to the platforms behind it.",
        role: "Frontend Developer",
        timeframe: "2023 - Present",
      },
      {
        achievements: [
          "Developed a design system that unified the brand across multiple platforms, improving design consistency by 40%.",
        ],
        company: "Timewitch",
        current: false,
        kind: "side",
        logo: "timewitch",
        pitch:
          "An internal app for the whole company: one place to see and manage what's going on across teams. I worked on both the screens and the server behind them.",
        role: "Fullstack intern",
        timeframe: "2023",
      },
    ],
  },
  workplace: "Accenture",
} as const
