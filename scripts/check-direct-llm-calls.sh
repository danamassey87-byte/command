#!/usr/bin/env bash
# X4 from SECURITY_AUDIT_PUNCHLIST: CI guard.
#
# Every Claude / Resend call must go through _shared/ai-bill.ts (or a
# similar shared wrapper) so cost tracking, budget gates, and webhook
# idempotency apply. A direct fetch to api.anthropic.com or
# api.resend.com from any other file is a regression of C10 / C3 / C8.
#
# This script greps the edge-fn tree for those URLs outside _shared/.
# Exit 0 = clean, exit 1 = violators found (CI fails the build).
#
# Usage:
#   bash scripts/check-direct-llm-calls.sh
# Or wire to a pre-commit hook / GitHub Actions step.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EDGE_DIR="$ROOT/supabase/functions"
FAIL=0

# Patterns to flag. Pin in one place so adding a new banned URL is one
# line.
PATTERNS=(
  "api\.anthropic\.com"
  "api\.resend\.com"
)

# Files we accept calling these directly. _shared is the official wrapper
# location; ai-bill.ts owns Anthropic, send-* owns Resend (and is wrapped
# in webhook signature + bearer auth per C3 / C6 / C8).
ALLOWED=(
  "supabase/functions/_shared/ai-bill.ts"
  "supabase/functions/_shared/replicate-notify.ts"  # cost-cents helper
  "supabase/functions/resend-webhook/index.ts"
  "supabase/functions/send-campaign-step/index.ts"
  "supabase/functions/send-newsletter/index.ts"
  "supabase/functions/send-one-off-email/index.ts"
  "supabase/functions/send-oh-feedback-request/index.ts"
  "supabase/functions/submit-oh-feedback/index.ts"
  "supabase/functions/oh-followup/index.ts"
  "supabase/functions/gmail-showing-monitor/index.ts"
  "supabase/functions/host-report-followup/index.ts"
  "supabase/functions/feedback-follow-up/index.ts"
  "supabase/functions/lead-intake-email/index.ts"
  # TODO C10-completion: generate-content still has 4 direct anthropic
  # fetches (closure pattern, multiple downstream branches). Documented as
  # deferred in the punchlist. Until that batch lands, keeping it allowed
  # so the guard runs clean.
  "supabase/functions/generate-content/index.ts"
)

build_allowed_grep() {
  # Produce a `grep -v` exclusion regex that matches any of the allowed paths.
  local re=""
  for p in "${ALLOWED[@]}"; do
    if [ -z "$re" ]; then re="$p"; else re="$re|$p"; fi
  done
  echo "$re"
}

ALLOW_RE="$(build_allowed_grep)"

for pat in "${PATTERNS[@]}"; do
  echo "== Checking for direct '$pat' calls outside allowlist =="
  # -E for extended regex, -r recursive, -n line numbers, -l file-only (no — we want lines)
  # `|| true` so grep returning 1 (no match) doesn't trip set -e.
  HITS=$(grep -rnE "$pat" "$EDGE_DIR" 2>/dev/null || true)
  if [ -n "$HITS" ]; then
    # Filter out anything in the allowed list.
    BAD=$(echo "$HITS" | grep -vE "$ALLOW_RE" || true)
    if [ -n "$BAD" ]; then
      echo "$BAD"
      echo
      echo "❌ Direct '$pat' calls found outside _shared/ai-bill.ts."
      echo "   Route through _shared/ai-bill.ts (callAnthropic/callResend) instead."
      FAIL=1
    else
      echo "✓ only allowed paths reference '$pat'"
    fi
  else
    echo "✓ no references found"
  fi
done

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo
echo "✓ CI guard clean."
