#!/bin/bash
# Verify every /assets/... URL referenced in markdown/ resolves under astro/public/.
# astro/public/ is the single source of truth for files served at /. If a markdown
# post references /assets/foo.png and astro/public/assets/foo.png does not exist,
# the live site 404s. This script catches that before deploy.
#
# A baseline file (scripts/check-assets-baseline.txt) lists already-known-broken
# refs that should not block deploys. Anything missing AND not in the baseline
# is a new break and fails. To resolve a baselined entry: restore the asset or
# remove the reference, then delete the line from the baseline.
#
# Usage:
#   scripts/check-assets.sh            # enforce: exit 1 on new (non-baselined) misses
#   scripts/check-assets.sh --report   # report all misses (incl. baselined), exit 0

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKDOWN_DIR="$REPO_ROOT/markdown"
PUBLIC_DIR="$REPO_ROOT/astro/public"
BASELINE_FILE="$REPO_ROOT/scripts/check-assets-baseline.txt"

mode="enforce"
if [[ "${1:-}" == "--report" ]]; then
  mode="report"
fi

if [[ ! -d "$MARKDOWN_DIR" ]]; then
  echo "check-assets: markdown/ not found at $MARKDOWN_DIR" >&2
  exit 2
fi
if [[ ! -d "$PUBLIC_DIR" ]]; then
  echo "check-assets: astro/public/ not found at $PUBLIC_DIR" >&2
  exit 2
fi

# Normalize baseline into a sorted, comment-stripped list (or empty if absent)
BASELINE_NORMALIZED="$(mktemp)"
trap 'rm -f "$BASELINE_NORMALIZED"' EXIT
if [[ -f "$BASELINE_FILE" ]]; then
  grep -vE '^[[:space:]]*(#|$)' "$BASELINE_FILE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sort -u > "$BASELINE_NORMALIZED"
fi

is_baselined() {
  [[ -s "$BASELINE_NORMALIZED" ]] && grep -Fxq "$1" "$BASELINE_NORMALIZED"
}

new_misses=()
baselined_misses=()

while IFS= read -r url; do
  rel="${url#/}"
  if [[ -f "$PUBLIC_DIR/$rel" ]]; then
    continue
  fi
  first_ref=$(grep -rl --include='*.md' -F "$url" "$MARKDOWN_DIR" | head -1)
  entry="  $url  (referenced in ${first_ref#$REPO_ROOT/})"
  if is_baselined "$url"; then
    baselined_misses+=("$entry")
  else
    new_misses+=("$entry")
  fi
done < <(grep -rhoE --include='*.md' '/assets/[^)" ]+' "$MARKDOWN_DIR" | sort -u)

if [[ "$mode" == "report" ]]; then
  if [[ ${#new_misses[@]} -gt 0 ]]; then
    echo "check-assets: ${#new_misses[@]} NEW missing reference(s):"
    printf '%s\n' "${new_misses[@]}"
  fi
  if [[ ${#baselined_misses[@]} -gt 0 ]]; then
    echo "check-assets: ${#baselined_misses[@]} baselined missing reference(s):"
    printf '%s\n' "${baselined_misses[@]}"
  fi
  if [[ ${#new_misses[@]} -eq 0 && ${#baselined_misses[@]} -eq 0 ]]; then
    echo "check-assets: all markdown asset references resolve under astro/public/"
  fi
  exit 0
fi

if [[ ${#new_misses[@]} -eq 0 ]]; then
  if [[ ${#baselined_misses[@]} -gt 0 ]]; then
    echo "check-assets: ok (${#baselined_misses[@]} baselined misses tracked in scripts/check-assets-baseline.txt)"
  else
    echo "check-assets: ok"
  fi
  exit 0
fi

echo "check-assets: ${#new_misses[@]} NEW missing asset reference(s):" >&2
for line in "${new_misses[@]}"; do
  echo "$line" >&2
done
echo "" >&2
echo "Fix by adding the asset under astro/public/<path> or removing the reference from the markdown." >&2
echo "If the break is intentional and tracked separately, add the URL to scripts/check-assets-baseline.txt." >&2
exit 1
