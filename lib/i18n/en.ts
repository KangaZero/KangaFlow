// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// English is the base locale: its shape defines the key/value types every other
// locale must satisfy (see ./index.ts). Keep keys in sync across locales.
// `as const` is required so nested string literals become the typed key surface.
const en = {
  about: {
    education: "Education",
    intro: {
      brand: "KangaFlow",
      welcome: "welcome to",
    },
    overview: "Overview",
    technical: "Technical skills",
    work: "Work",
  },
  achievements: {
    filter: {
      label: "Filter by rarity",
    },
    heading: "Achievements",
    hidden: "???",
    items: {
      eos: {
        description: "Changed the theme of the page.",
        title: "Eos",
      },
      "go-touch-grass": {
        description: "Unlocked every achievable achievement.",
        title: "Go Touch Grass",
      },
      "new-beginnings": {
        description: "Entered the site for the first time.",
        title: "New Beginnings",
      },
      "out-of-bounds": {
        description: "Wandered somewhere you were not meant to go.",
        title: "Out of Bounds",
      },
      "puzzle-master": {
        description: "Solved the most difficult puzzle ever devised.",
        title: "Puzzle Master",
      },
      "sand-mandala": {
        description: "Reset your progress under mysterious conditions.",
        title: "Sand Mandala",
      },
      "snoopy-detective": {
        description: "Hovered the date & weather box.",
        title: "Snoopy Detective",
      },
      speedophile: {
        description: "Completed everything in under 67 seconds.",
        title: "Speedophile",
      },
    },
    locked: "Locked",
    rarities: {
      common: "Common",
      legendary: "Legendary",
      mythic: "Mythic",
      rare: "Rare",
      uncommon: "Uncommon",
    },
    search: {
      noResults: "No achievements found.",
      placeholder: "Search achievements…",
      results: "result(s)",
    },
    share: "Share",
    toast: {
      dismiss: "Dismiss",
      unlocked: "Achievement unlocked!",
    },
    toggleColumns: "Toggle layout",
    unlocked: "Unlocked",
  },
  command: {
    description: "Run a command or search.",
    empty: "No results.",
    groups: {
      general: "General",
      locale: "Language",
      navigation: "Navigation",
      theme: "Theme",
    },
    locales: {
      en: "English",
      ja: "日本語",
    },
    placeholder: "Type a command or search…",
    quit: "Quit",
    title: "Command Palette",
  },
  common: {
    loading: [
      "Did you know waiting causes time to pass",
      "It is impossible to open doors that are already open",
      "The word 'water' looks nothing like 水",
    ],
    notFound: {
      heading: "Page Not Found",
      link: "Return Home",
      text: "The page you are looking for does not exist.",
    },
  },
  headerCard: {
    basedIn: "Based in",
    status: "Currently coding",
    workplace: "Working at Accenture",
  },
  headerDate: {
    days: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    months: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
  },
  home: {
    commandHint: "Press : for commands",
    tagline: "A little flow app.",
    themeHint: "Press d to cycle theme",
  },
  nav: {
    achievements: "Achievements",
    home: "Home",
    language: "Language",
    settings: "Settings",
  },
  settings: {
    actions: {
      cycleTheme: "Cycle theme",
      goAchievements: "Go to achievements",
      goHome: "Go to home",
      openCommandMenu: "Open command menu",
      toggleColumns: "Toggle grid columns",
      toggleLanguage: "Toggle language",
      toggleSettings: "Toggle settings",
    },
    currentLabel: "Current",
    description: "Rebind keyboard shortcuts. Changes save automatically.",
    errors: {
      duplicate: "This combination is already in use.",
      empty: "Set a key for this shortcut.",
      noModifier: "Add a modifier so this doesn't fire while typing.",
    },
    keyLabel: "Key",
    resetToDefaults: "Reset to defaults",
    title: "Keyboard shortcuts",
  },
  theme: {
    dark: "Dark theme",
    label: "Theme",
    light: "Light theme",
    terminal: "Terminal theme",
  },
  weather: {
    // Descriptions keyed by WMO weather-interpretation code (Open-Meteo). Only
    // codes 0/1 differ between day and night; the rest repeat for a uniform,
    // type-safe shape. Icon mapping lives in lib/weather.ts, not here.
    conditions: {
      "0": { day: "Sunny", night: "Clear" },
      "1": { day: "Mainly Sunny", night: "Mainly Clear" },
      "2": { day: "Partly Cloudy", night: "Partly Cloudy" },
      "3": { day: "Cloudy", night: "Cloudy" },
      "45": { day: "Foggy", night: "Foggy" },
      "48": { day: "Rime Fog", night: "Rime Fog" },
      "51": { day: "Light Drizzle", night: "Light Drizzle" },
      "53": { day: "Drizzle", night: "Drizzle" },
      "55": { day: "Heavy Drizzle", night: "Heavy Drizzle" },
      "56": { day: "Light Freezing Drizzle", night: "Light Freezing Drizzle" },
      "57": { day: "Freezing Drizzle", night: "Freezing Drizzle" },
      "61": { day: "Light Rain", night: "Light Rain" },
      "63": { day: "Rain", night: "Rain" },
      "65": { day: "Heavy Rain", night: "Heavy Rain" },
      "66": { day: "Light Freezing Rain", night: "Light Freezing Rain" },
      "67": { day: "Freezing Rain", night: "Freezing Rain" },
      "71": { day: "Light Snow", night: "Light Snow" },
      "73": { day: "Snow", night: "Snow" },
      "75": { day: "Heavy Snow", night: "Heavy Snow" },
      "77": { day: "Snow Grains", night: "Snow Grains" },
      "80": { day: "Light Showers", night: "Light Showers" },
      "81": { day: "Showers", night: "Showers" },
      "82": { day: "Heavy Showers", night: "Heavy Showers" },
      "85": { day: "Light Snow Showers", night: "Light Snow Showers" },
      "86": { day: "Snow Showers", night: "Snow Showers" },
      "95": { day: "Thunderstorm", night: "Thunderstorm" },
      "96": { day: "Thunderstorm With Hail", night: "Thunderstorm With Hail" },
      "99": {
        day: "Heavy Thunderstorm With Hail",
        night: "Heavy Thunderstorm With Hail",
      },
    },
    loading: "Fetching weather…",
    unavailable: "Weather unavailable",
  },
} as const

export default en
