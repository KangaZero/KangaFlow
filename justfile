# [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
# KangaFlow task runner. One Biome (node_modules) drives hook, CI, and just.
# Run `just` with no args to list recipes.

_default:
    @just --list

# Start the Next.js dev server.
dev:
    pnpm dev

# Production static export into ./out.
build:
    pnpm build

# Auto-fix + format everything (Biome, writes in place).
fix:
    pnpm exec biome check --write .

# Lint + format check, no writes (what CI runs).
lint:
    pnpm exec biome ci .

# Type-check with the native TypeScript 7 compiler.
typecheck:
    pnpm exec tsc --noEmit

# Run the test suite once (non-watch).
test:
    pnpm test -- --run

# Full gate: everything CI runs, in the same order.
verify: lint typecheck test build

# List files still carrying a "Human review needed" marker (see AI_POLICY.md).
review:
    bash scripts/review-markers.sh

# Print just the count of files still pending human review.
review-count:
    @bash scripts/review-markers.sh --count

# Serve ./out exactly as GitHub Pages will (under the /KangaFlow basePath).
# Visit http://localhost:8000/KangaFlow/
preview: build
    rm -rf .preview
    mkdir -p .preview
    ln -sfn ../out .preview/KangaFlow
    @echo "Preview: http://localhost:8000/KangaFlow/"
    python3 -m http.server 8000 --directory .preview

# Remove build + preview artifacts.
clean:
    rm -rf out .next .preview

# Gate locally, then push — the GitHub Actions workflow deploys to Pages.
push: verify
    git push

# Alias for push (deployment happens in CI).
deploy: push
