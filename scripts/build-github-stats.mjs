// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
//
// Regenerates lib/github-stats.json: the live numbers on the project trading
// cards (commit counts, language bytes) and the Supporter card (merged
// nixpkgs / upstream PRs, maintained nixpkgs packages).
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/build-github-stats.mjs
//   (or `just stats`)
//
// Static export: nothing is fetched at runtime. The generated JSON is
// committed, so a build without network or token still has numbers; CI may
// refresh it before building. Any failed request keeps the previous value
// rather than writing a zero, and the script never fails the build.

import { readFile, writeFile } from "node:fs/promises"

const OWNER = "KangaZero"
const REPOS = ["KangaFlow", "neomouse", "hello-world-pp"]
const OUT = new URL("../lib/github-stats.json", import.meta.url)
const token = process.env.GITHUB_TOKEN ?? ""

async function gh(path, { raw = false } = {}) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "kangaflow-stats",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return raw ? response : response.json()
}

// Commit count without paging through history: ask for one commit per page
// and read the last page number from the Link header.
async function commitCount(repo) {
  const response = await gh(`repos/${OWNER}/${repo}/commits?per_page=1`, {
    raw: true,
  })
  const last = /[?&]page=(\d+)>; rel="last"/.exec(
    response.headers.get("link") ?? ""
  )
  return last ? Number(last[1]) : (await response.json()).length
}

async function searchCount(query) {
  const data = await gh(
    `search/issues?q=${encodeURIComponent(query)}&per_page=1`
  )
  return data.total_count
}

// nixpkgs packages listing the owner as a maintainer (pkgs/by-name/xx/NAME/…).
// Code search needs a token; without one this keeps the previous list.
async function maintainedPackages() {
  const data = await gh(
    `search/code?q=${encodeURIComponent(`repo:NixOS/nixpkgs ${OWNER.toLowerCase()}`)}&per_page=100`
  )
  const names = data.items
    .map((item) => /^pkgs\/by-name\/[^/]+\/([^/]+)\//.exec(item.path)?.[1])
    .filter((name) => typeof name === "string")
  return [...new Set(names)].sort()
}

async function attempt(label, fn, fallback) {
  try {
    return await fn()
  } catch (error) {
    console.warn(
      `github-stats: ${label} failed (${error.message}); keeping previous value`
    )
    return fallback
  }
}

const previous = JSON.parse(await readFile(OUT, "utf8").catch(() => "{}"))
const repos = {}
for (const repo of REPOS) {
  const before = previous.repos?.[repo] ?? {}
  repos[repo] = {
    commits: await attempt(
      `${repo} commits`,
      () => commitCount(repo),
      before.commits ?? 0
    ),
    languages: await attempt(
      `${repo} languages`,
      () => gh(`repos/${OWNER}/${repo}/languages`),
      before.languages ?? {}
    ),
  }
}
const before = previous.contributions ?? {}
const contributions = {
  nixpkgsMaintained: await attempt(
    "nixpkgs maintainers",
    maintainedPackages,
    before.nixpkgsMaintained ?? []
  ),
  nixpkgsMergedPRs: await attempt(
    "nixpkgs PRs",
    () => searchCount(`author:${OWNER} repo:NixOS/nixpkgs is:pr is:merged`),
    before.nixpkgsMergedPRs ?? 0
  ),
  upstreamMergedPRs: await attempt(
    "upstream PRs",
    // Other people's projects only: excludes the owner's repos and a
    // collaborator's projects where most of these PRs were team work.
    () =>
      searchCount(
        `author:${OWNER} is:pr is:merged -user:${OWNER} -user:mecuboi`
      ),
    before.upstreamMergedPRs ?? 0
  ),
}

const stats = {
  contributions,
  generatedAt: new Date().toISOString().slice(0, 10),
  repos,
}
await writeFile(OUT, `${JSON.stringify(stats, null, 2)}\n`)
console.log(`github-stats: wrote ${OUT.pathname}`)
