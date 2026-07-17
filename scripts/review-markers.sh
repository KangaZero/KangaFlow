#!/usr/bin/env bash
# [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
#
# Report files still carrying a "Human review needed" marker.
#
# AI_POLICY.md (Principle 1) requires AI-generated content to carry a review
# marker until a human confirms it, then the marker is removed. A marker is
# either a Markdown admonition (`> **Human review needed …`) or a native-comment
# line (`// [!IMPORTANT] Human review needed …`, `# [!IMPORTANT] …`). This script
# counts how many files still have one.
#
# The search pattern is built from a variable so this script does not match
# itself except on its own marker line above.
#
# Modes:
#   (none)    human-readable report; always exits 0
#   --count   print just the number of files still pending
#   --check   exit 1 if any file is pending (for CI gating); else exit 0
#   --json    print a shields.io endpoint badge object
#
# Run via `just review` or `bash scripts/review-markers.sh [mode]`.
set -euo pipefail

tag='Human review needed'
# A marker is the bold Markdown form OR an [!IMPORTANT] comment form.
pattern="(\\*\\*${tag})|(\\[!IMPORTANT\\].*${tag})"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

mapfile -t files < <(
  grep -rIlE \
    --exclude-dir=.git \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=out \
    --exclude-dir=.preview \
    -e "$pattern" . 2>/dev/null | sort
)
count="${#files[@]}"

case "${1:-}" in
  --count)
    printf '%s\n' "$count"
    ;;
  --check)
    if ((count > 0)); then
      printf '%s file(s) pending human review; see `just review`.\n' "$count" >&2
      exit 1
    fi
    printf 'All AI-generated content has been reviewed.\n'
    ;;
  --json)
    if ((count == 0)); then
      color=brightgreen
      msg='reviewed'
    else
      color=orange
      msg="${count} pending"
    fi
    printf '{"schemaVersion":1,"label":"human review","message":"%s","color":"%s"}\n' \
      "$msg" "$color"
    ;;
  '')
    if ((count == 0)); then
      printf '\342\234\223 No files pending — all AI-generated content has been reviewed.\n'
      exit 0
    fi
    printf '%s file(s) pending human review:\n\n' "$count"
    for f in "${files[@]}"; do
      printf '  %s\n' "$f"
    done
    ;;
  *)
    printf 'usage: %s [--count|--check|--json]\n' "$0" >&2
    exit 2
    ;;
esac
