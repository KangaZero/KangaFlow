// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the tsconfig "@/*" -> project-root alias.
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "jsdom",
  },
})
