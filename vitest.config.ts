// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import react from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the tsconfig "@/*" -> project-root alias.
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "jsdom",
    // Keep the defaults and also skip build/nix artifacts (the nix devshell
    // stages a repo copy under .direnv/ that would be discovered twice).
    exclude: [...configDefaults.exclude, ".direnv/**", "out/**", ".next/**"],
    // jsdom suites run in parallel workers; under CPU contention (a build or a
    // headless browser alongside) the 5s default flaked unrelated tests.
    testTimeout: 15_000,
  },
})
