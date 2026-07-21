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
    "Professional Frontend Developer specialized in React and TypeScript.",
    "Hobbyist Backend Developer and Rust, Golang, NIXOS enjoyer.",
  ],
  lastName: "Yong",

  // IANA time zone (falls back to Asia/Tokyo); used for the weather forecast.
  location: getLocalTimeZone(),
  // [latitude, longitude] for Tokyo.
  locationCoordinates: [35.660504, 139.724981],
  name: "Samuel Wai Weng Yong",

  role: "Frontend Developer",

  // Romaji + furigana (+ optional kanji) per name part. The About header fades
  // the furigana in on the Japanese locale and out on English.
  rubyName: [
    { furigana: "サムエル", kanji: "", romaji: "Samuel" },
    { furigana: "ワイウエング", kanji: "偉栄", romaji: "Wai Weng" },
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
    { category: "professional", icon: "react", name: "React" },
    { category: "professional", icon: "javascript", name: "JavaScript" },
    { category: "professional", icon: "git", name: "Git" },
    { category: "professional", icon: "bash", name: "Bash" },
    { category: "hobby", icon: "vue", name: "Vue" },
    { category: "hobby", icon: "rust", name: "Rust" },
    { category: "hobby", icon: "go", name: "Go" },
    { category: "hobby", icon: "nixos", name: "NixOS" },
    { category: "hobby", icon: "vim", name: "Vim" },
  ],

  // Work section. `subtitle`/`subtitleBlur` drive the TrueFocus heading: the
  // first word reads "Backend" while blurred and "Frontend" while focused.
  work: {
    experiences: [
      {
        achievements: [
          "Unified a fragmented ecosystem of legacy tools (Excel, PowerPoint, and Sharepoint docs) into a single, standardized platform, creating a “single source of truth” for enterprise workflows.",
          "Developed interactive visual builders, including an SAP component canvas and a design-flow engine, allowing users to build and test enterprise applications through a drag-and-drop interface.",
          "Engineered an “App-Wide Intelligence” layer that enables the platform to automatically read, update, and refactor data across the entire web application to ensure consistency.",
          "Transformed the Developer Experience (DX) by replacing slow, manual documentation processes with automated tools, significantly reducing project delivery times and operational costs.",
        ],
        company: "Accenture",
        role: "Frontend Developer",
        timeframe: "2023 - Present",
      },
      {
        achievements: [
          "Developed a design system that unified the brand across multiple platforms, improving design consistency by 40%.",
        ],
        company: "Timewitch",
        role: "Fullstack intern",
        timeframe: "2023",
      },
    ],
    subtitle: "Frontend Developer",
    subtitleBlur: "Backend",
  },
  workplace: "Accenture",
} as const
