# KangaFlow — Working Rules

> [!IMPORTANT]
> **Human review needed.** This file is AI-generated prose and has not yet been
> confirmed by a human. Once reviewed, remove this notice (see AI_POLICY.md).

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn ("radix-mira") ·
static export to GitHub Pages under `/KangaFlow`.

## Non-negotiables

1. **One source of truth.** Each concept lives in exactly one place and is
   derived elsewhere: themes → `lib/themes.ts` (tuple → `Theme` union), locales →
   `lib/i18n` (`Locale`, dictionaries), WMO/weather → `lib/weather.ts`. Add a
   value once; let types/lists/validation derive from it.

2. **Web-verify everything external.** Never trust memory for versions, API
   shapes, or syntax. Check the upstream schema / release page / official docs
   before using an API or pinning a version. No hallucinated, deprecated, or
   legacy code — latest **stable** and modern practice only.

3. **Strict TypeScript, no escape hatches.** `any` is banned (Biome errors on
   it); use `unknown` + narrowing as a last resort. Prefer literal-string
   unions, generics, and custom type helpers. `tsconfig` runs
   `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
   `noFallthroughCasesInSwitch` — write code that satisfies them.

   **Type as narrowly as the value actually is.** The rule above kept being
   satisfied by code that was still loose, so, concretely:

   - **Never `string` where a literal union exists.** `route: string` let a page
     name a route that does not exist; `PageRoute` does not. Same for `locale:
     string` vs `Locale`.
   - **Derive, never re-list.** A second spelling of a set is a second thing to
     forget: `AppPath` is `` `/${Locale}/${PageSegment}` `` built from `PAGE`,
     not a hand-written union that has to be widened whenever a page is added.
   - **`as const satisfies` over a trailing `as` cast.** `satisfies` enforces
     the shape AND keeps every value literal; a cast throws the literals away
     and asserts a shape nobody checked.
   - **Parameterise over keys.** A descriptor whose `execute` takes
     `Record<string, unknown>` will accept a misspelled destructure forever.
     Give it `<K extends string>` so the declared keys, the `required` list and
     the destructure are one thing.
   - **But do not type a value you have not validated.** Arguments arriving
     from a model, the network or `localStorage` are `unknown`, and the runtime
     guard is the real check. Typing them as `string` is a claim the compiler
     cannot back, and it makes the guard look redundant enough to delete.

   A type is only strict if breaking it fails the build — when you tighten one,
   mutate a call site and confirm `just typecheck` actually reds.

4. **No hardcoded UI labels.** Every user-visible string goes through i18n
   (`t` / `useLocale().translate`) with keys in BOTH `en` and `ja` (JA authored,
   not machine-guessed). Adding a key to `en` and omitting it in `ja` fails the
   `Widen` `satisfies` check.

5. **Always test.** Pure logic gets a Vitest unit test (i18n `t`, weather
   helpers, achievements reducer, locale/theme helpers). `just test`.

6. **Three-agent cell per task.** Implementer writes; checker runs
   `just lint && just typecheck && just test && just build` + browser checks via
   chrome-devtools MCP; supervisor web-verifies external facts and signs off.

## Toolchain (verified facts — do not regress)

- **Biome 2.4.16 only** (pinned to nixpkgs). No ESLint/Prettier. One binary for
  the git hook, CI, and `just` — run from `node_modules/.bin/biome`. 2.4.16 has
  no `linter.rules.preset`; strictness = `recommended` + `nursery.recommended` +
  `linter.domains` all + `useSortedClasses` (error). `noUnresolvedImports` /
  `useImportExtensions` are OFF (they live in `correctness`), and Tailwind v4
  needs `css.parser.tailwindDirectives: true`.
- **TypeScript 7** (Go-native `tsc`) from `node_modules`. Requires **Next
  16.3** (`experimental.useTypeScriptCli: true`); stable Next 16.2 crashes on
  TS7. Next is pinned to a `16.3.0-preview` — deliberate, to keep TS7.
- **Node 26**, **pnpm** (version from `packageManager`), **just**. `nodejs_26`
  in the flake; matches CI.
- Imports use the `@/` alias, **extensionless**, no relative `./`.

## Static-export constraints

- `output: "export"` → no server, **no middleware/`proxy`**. i18n routing is
  client-side: `app/[lang]` with `generateStaticParams` (en/ja) +
  `dynamicParams = false`; root `/` client-redirects. Anything needing a request
  is fetched client-side (e.g. weather via Open-Meteo).
- `basePath`/`assetPrefix` `/KangaFlow` in prod; `public/.nojekyll`;
  `images.unoptimized`; `trailingSlash`.

## UI

- Prefer **animate-ui** (`@animate-ui` shadcn registry) for animated components;
  **Motion** (not GSAP) for bespoke animation. shadcn primitives otherwise.
- Loading: shadcn `Skeleton` for content-shaped placeholders (weather box);
  animate-ui spinner only for generic Suspense fallbacks.
- Rarity/theme/status colours → CSS custom-property tokens in `globals.css`,
  never inline hex.

## AI policy (see AI_POLICY.md)

AI-generated prose (comments/docs) carries a `Human review needed` marker until
a human confirms it (then delete the marker). `just review` / `just review-count`
track the backlog. Commits disclose assistance with an
`Assisted-by: Claude Code (<model>)` trailer. Code substance must be human work.

## Deploy

`just verify` (lint + typecheck + test + build) must be green. `just push`
verifies then pushes; GitHub Actions builds + deploys to Pages. Repo runs under
the personal `KangaZero` identity (set repo-local, not global).
