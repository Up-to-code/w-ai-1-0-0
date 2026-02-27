#!/usr/bin/env bash
set -euo pipefail

expected="dev:hardy-gopher-480"

current="${CONVEX_DEPLOYMENT:-}"
if [[ -z "$current" && -f ".env.local" ]]; then
  current="$(grep -E '^CONVEX_DEPLOYMENT=' .env.local | head -n1 | cut -d'=' -f2- | sed 's/[[:space:]]#.*$//' | tr -d '\r')"
fi

if [[ "$current" != "$expected" ]]; then
  echo "Convex deployment mismatch."
  echo "Expected: $expected"
  echo "Current:  ${current:-<unset>}"
  echo "Set CONVEX_DEPLOYMENT=$expected before deploying."
  exit 1
fi

echo "Convex deployment check passed: $current"
