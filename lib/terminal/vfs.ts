// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure virtual-filesystem model for the in-browser terminal. Repo source files
// are keyed by their repo-relative path (e.g. "app/[lang]/page.tsx"); splitting
// each key on "/" yields a POSIX-style directory tree the shell can navigate
// with cd/pwd/ls/cat. No React/DOM/Node — total, pure functions only.

export type VfsNode = {
  name: string
  type: "dir" | "file"
  children: Map<string, VfsNode>
}

/** Build the tree from repo-relative file keys. Returns the root dir node. */
export function buildVfs(paths: readonly string[]): VfsNode {
  const root: VfsNode = { children: new Map(), name: "", type: "dir" }

  for (const path of paths) {
    const segments = path.split("/").filter((segment) => segment.length > 0)
    if (segments.length === 0) {
      continue
    }

    let current = root
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index]
      if (segment === undefined) {
        continue
      }
      const isLeaf = index === segments.length - 1

      const existing = current.children.get(segment)
      if (existing !== undefined) {
        current = existing
        continue
      }

      const node: VfsNode = {
        children: new Map(),
        name: segment,
        // Leaves are files; every intermediate segment is a directory.
        type: isLeaf ? "file" : "dir",
      }
      current.children.set(segment, node)
      current = node
    }
  }

  return root
}

/**
 * Resolve `arg` against absolute `cwd`. Handles absolute paths, "~"/"~/x" home
 * aliases, "." and ".." segments (".." clamps at root), empty arg → cwd, and
 * trailing slashes. Returns a normalised absolute path (leading "/", no
 * trailing slash except root "/"). Never throws.
 */
export function resolvePath(cwd: string, arg: string): string {
  const trimmed = arg.trim()

  let base: readonly string[]
  if (trimmed === "" || trimmed === ".") {
    base = splitAbsolute(cwd)
  } else if (trimmed === "~") {
    base = []
  } else if (trimmed.startsWith("~/")) {
    base = splitAbsolute(trimmed.slice(1))
  } else if (trimmed.startsWith("/")) {
    base = splitAbsolute(trimmed)
  } else {
    base = [...splitAbsolute(cwd), ...splitAbsolute(trimmed)]
  }

  const resolved: string[] = []
  for (const segment of base) {
    if (segment === "" || segment === ".") {
      continue
    }
    if (segment === "..") {
      // Clamp at root: popping past "/" stays "/".
      resolved.pop()
      continue
    }
    resolved.push(segment)
  }

  return resolved.length === 0 ? "/" : `/${resolved.join("/")}`
}

/** Split a "/"-delimited path into its non-empty segments. */
function splitAbsolute(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0)
}

/** Locate the node at `absPath`, or null if nothing exists there. */
export function nodeAt(root: VfsNode, absPath: string): VfsNode | null {
  let current = root
  for (const segment of splitAbsolute(absPath)) {
    const next = current.children.get(segment)
    if (next === undefined) {
      return null
    }
    current = next
  }
  return current
}

/**
 * Sorted directory entries (dirs first, then files, each group alphabetical),
 * or null if `absPath` is not a directory.
 */
export function listDir(
  root: VfsNode,
  absPath: string
): { name: string; type: "dir" | "file" }[] | null {
  const node = nodeAt(root, absPath)
  if (node === null || node.type !== "dir") {
    return null
  }

  return [...node.children.values()]
    .map((child) => ({ name: child.name, type: child.type }))
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
}

/** Pretty cwd for the prompt: root "/" → "~", otherwise "~"-prefixed. */
export function displayCwd(absPath: string): string {
  return absPath === "/" ? "~" : `~${absPath}`
}

/**
 * Map a site route pathname (e.g. "/en/timeline") to a starting cwd inside the
 * flat page tree: strip the leading /<locale> segment, then start in that page's
 * dir ("/timeline"), or "/" (home) for a locale-only route. Falls back to "/"
 * if the target dir doesn't exist.
 */
export function cwdForRoute(pathname: string, root: VfsNode): string {
  // Drop the leading locale segment; whatever remains is the page sub-path.
  const [, ...rest] = splitAbsolute(pathname)
  const target = resolvePath("/", rest.join("/"))

  const node = nodeAt(root, target)
  if (node === null || node.type !== "dir") {
    return "/"
  }
  return target
}
