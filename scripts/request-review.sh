#!/usr/bin/env bash
# scripts/request-review.sh
# ---------------------------------------------------------------------------
# When this repo is opened from a fork, the fork-scoped gh token returns 403
# on the direct paths that would formally request reviewers:
#
#   - gh pr edit <N> --add-reviewer <login>[,<login2>,...]
#       -> GraphQL error: `Resource not accessible by integration
#                           (requestReviewsByLogin)`
#   - REST POST /repos/{owner}/{repo}/pulls/{N}/requested_reviewers
#       -> 403: `Resource not accessible by integration`
#
# This script encapsulates the same workaround that has been used on
# PRs #491 and #495 of MERIDIAN-CITY/Meridians-verse: try the direct paths
# first (so the script is harmless when run from an upstream-write-token env,
# e.g. by a maintainer), and on 403, post a PR comment containing a
# ready-to-paste maintainer incantation + a TL;DR for the human reviewer.
# The fallback comment is also dedup-aware: a re-run that finds an existing
# fallback comment will skip reposting (idempotent, exit 3).
#
# Usage:
#   bash scripts/request-review.sh [<--dry-run>] [--report-json] <PR_NUMBER> \
#       <REVIEWER_LOGIN> [<REVIEWER_LOGIN> ...]
#
# Flags:
#   --dry-run        Echoes what each gh call would do (3 ">>>" lines) without
#                    making any GitHub API mutations; exits 4.
#   --report-json    On exit, emits a single JSON summary line to stdout
#                    (suitable for downstream capture; intended for CI
#                    consumers that want to key off outcome / exit_code).
#   --help | -h      Print this header docstring and exit 0.
#
# Examples:
#   bash scripts/request-review.sh 495 Qoder-Undefined
#   bash scripts/request-review.sh 496 Mmesolove Promise278
#   bash scripts/request-review.sh --dry-run 495 Mmesolove
#   bash scripts/request-review.sh --report-json 496 Mmesolove | jq .
#   bash scripts/request-review.sh --help
#   REQUEST_REVIEW_REPO=Senorespecial/Meridians-verse \
#     bash scripts/request-review.sh 495 Qoder-Undefined
#
# Environment:
#   REQUEST_REVIEW_REPO   target repo (default: MERIDIAN-CITY/Meridians-verse).
#                         Override only if you are running against a different
#                         fork/owner.
#
# Exit codes:
#   0  - direct API request succeeded (formal review request posted)
#   2  - direct API 403'd; fallback comment posted -- a maintainer can
#        copy-paste the embedded command to convert the ping into a
#        formal review request
#   3  - direct API 403 would have hit, but a fallback comment from a prior
#        run already exists on the PR (REAL idempotent skip). The existing
#        comment still requires maintainer outreach; the script just
#        doesn't duplicate the GitHub comment thread.
#   4  - dry-run mode end (--dry-run). No API mutation occurred. Differs
#        from exit 3 in that exit 3 means "I would have posted but a
#        prior run already did"; exit 4 means "I deliberately did not
#        post (please re-run without --dry-run)".
#   1  - bad arguments / gh CLI not authenticated / unrecoverable error
# ---------------------------------------------------------------------------
set -euo pipefail

# Single source of truth for the idempotency marker. Embedded in the Python-
# built comment body header and matched by the dedup grep below; if a
# maintainer ever edits the body header, edit DEDUP_MARKER to match.
DEDUP_MARKER='Reviewer-request helper'

DRY_RUN=0
REPORT_JSON=0

# Pre-scan for --report-json in $@ so emit_json can fire on fatal flag-exit
# paths regardless of flag order. Without this, the bash idiom
# `bash ... --typo --report-json` produces 0 stdout lines: the flag-parse
# loop matches `-*)` on `--typo` first and exits before `--report-json` is
# ever consumed, so REPORT_JSON stays 0 and emit_json silently no-ops.
# Mirroring `bash ... --report-json --typo` works only because the loop
# consumes `--report-json` first; pre-scanning up front makes both orders
# (and any other flag ordering with `--report-json`) behave the same way,
# which is what CI consumers piping to `jq .` actually need. The main
# while-loop below still has its own `--report-json)` arm; the duplication
# is intentional -- pre-scan handles fatal-exit cases (when the loop exits
# on `--typo` before reaching `--report-json`), main-loop handles the
# normal "loop completes" cases (where both pre-scan and main-loop set
# REPORT_JSON=1 redundantly and harmlessly).
for arg in "$@"; do
  case "$arg" in
    --report-json) REPORT_JSON=1; break ;;
  esac
done

# emit_json OUTCOME EXIT_CODE
# Emits a single-line JSON summary to stdout when REPORT_JSON=1; no-op
# otherwise. The Python heredoc is the JSON builder (Unicode + escaping
# safety; shell f-strings or printf would fight with curly braces and
# special chars in the field values). Defined BEFORE the flag-parse loop
# because the unknown-flag `-*)` branch below calls it during early exit,
# and bash does NOT hoist function definitions -- a function call before
# its definition line is executed fails with `command not found`.
emit_json() {
  local outcome="$1" exit_code="$2"
  if [ "$REPORT_JSON" -ne 1 ]; then return 0; fi
  # ${VAR:-} defaults guard against `set -u` triggering before PARGS has
  # been parsed (e.g. from the bad_args early-exit path). After parse all
  # three bindings are populated as expected.
  python3 - "${PR_NUMBER:-}" "${LIST:-}" "${DRY_RUN:-}" "$outcome" "$exit_code" <<'PYEOF'
import json, sys
pr, list_arg, dry_run, outcome, exit_code = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
mode = "dry_run" if dry_run == "1" else "real"
# Tolerate empty inputs (called from the bad_args / unknown-flag early-exit
# paths when PR_NUMBER / exit_code haven't been parsed yet). Crashing here
# would propagate a Python nonzero exit through `set -e` and abort the
# script before the JSON line was printed.
def _int_or_none(s):
  try:
    return int(s)
  except (TypeError, ValueError):
    return None
print(json.dumps({
  "pr": _int_or_none(pr),
  "reviewers": [r for r in list_arg.split(",") if r],
  "outcome": outcome,
  "mode": mode,
  "exit_code": _int_or_none(exit_code),
}, separators=(",", ":")))
PYEOF
}

# Flag parse loop (not a one-shot case): consumes ANY combination of leading
# flags in any order before the first positional arg, so e.g.
#   bash request-review.sh --report-json --dry-run 495 Qoder-Undefined
# and
#   bash request-review.sh --dry-run --report-json 495 Qoder-Undefined
# behave identically. Without the loop, only `--dry-run --report-json` order
# would work, and `--report-json --dry-run` would leak `--dry-run` into the
# PR_NUMBER slot, producing `gh pr edit "--dry-run" ...` and a hard error.
# Unknown flags fall through to the bad_args path so mis-typed flags don't
# silently disable the rest of the script. Positional args (the PR_NUMBER,
# then the reviewers) hit the `*) break` and exit the loop with all flags
# already consumed.
while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      sed '/^set -euo pipefail/q;p' "$0"
      exit 0
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --report-json)
      REPORT_JSON=1
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      cat >&2 <<USAGE
Usage: bash $0 [--dry-run] [--report-json] <PR_NUMBER> <REVIEWER_LOGIN> [<REVIEWER_LOGIN> ...]
USAGE
      emit_json "bad_args" 1
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -lt 2 ]; then
  cat >&2 <<USAGE
Usage: bash $0 [--dry-run] [--report-json] <PR_NUMBER> <REVIEWER_LOGIN> [<REVIEWER_LOGIN> ...]

Examples:
  bash $0 495 Qoder-Undefined
  bash $0 496 Mmesolove Promise278
  bash $0 --dry-run 495 Mmesolove
  bash $0 --report-json 496 Mmesolove | jq .
USAGE
  emit_json "bad_args" 1
  exit 1
fi

PR_NUMBER=$1
shift
REVIEWERS=("$@")

REPO=${REQUEST_REVIEW_REPO:-MERIDIAN-CITY/Meridians-verse}

LIST=$(IFS=,; echo "${REVIEWERS[*]}")
REVIEWER_LIST=$(IFS=,; echo "${REVIEWERS[*]}")

# Dry-run wrapper: echoes the would-do command and returns 0; otherwise
# invokes the supplied command. Returning 0 in dry-run mode mimics success
# so the caller's `if run_gh ...; then ... exit 0; fi` pattern doesn't
# short-circuit early; instead, in dry-run mode the script falls through
# to also log what Steps 2 and 3 would do (Step 2.5 is skipped dry-run).
run_gh() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo ">>> [dry-run] would run: $*" >&2
    return 0
  fi
  "$@"
}

# Step 1: try the direct gh pr edit path (works from an upstream-write token).
# `>/dev/null` (NOT `2>&1 >&2`) suppresses gh's stdout so it doesn't pollute
# the JSON-on-stdout contract; gh's stderr is left visible to the operator.
# The earlier `2>&1 >&2` form was buggy: it chained fd2 to fd1 first and then
# fd1 to the now-shared target, so run_gh's dry-run `echo ... >&2` ALSO
# landed on stdout (since run_gh inherits the call's redirections). Switching
# to `>/dev/null` keeps fd2 untouched, so run_gh's stderr writes stay on
# stderr as intended.
if run_gh gh pr edit "${PR_NUMBER}" --repo "${REPO}" --add-reviewer "${LIST}" \
   >/dev/null; then
  if [ "$DRY_RUN" -eq 0 ]; then
    echo ">>> Direct request succeeded via gh pr edit --add-reviewer" >&2
    emit_json "direct_succeeded" 0
    exit 0
  fi
  # dry-run: fall through to log what Steps 2 and 3 would do
fi

# Step 2: try the REST endpoint (sometimes a slightly different scope path;
# same 403 in practice on fork-scoped tokens, but cheap to attempt).
REST_ARGS=()
for R in "${REVIEWERS[@]}"; do
  REST_ARGS+=(-f "reviewers[]=${R}")
done
if run_gh gh api "repos/${REPO}/pulls/${PR_NUMBER}/requested_reviewers" -X POST \
    "${REST_ARGS[@]}" >/dev/null; then
  if [ "$DRY_RUN" -eq 0 ]; then
    echo ">>> Direct request succeeded via REST /requested_reviewers" >&2
    emit_json "direct_succeeded" 0
    exit 0
  fi
  # dry-run: fall through to log what Step 3 would do
fi

# Step 2.5 (idempotency): if a fallback comment from a prior run already
# exists on this PR (matched by the unique header marker), don't repost --
# exit 3 so callers can distinguish "comment already posted, no fresh work"
# from exit 2 "comment was just posted, maintainer outreach required".
# Skipped entirely in dry-run mode.
if [ "$DRY_RUN" -eq 0 ]; then
  EXISTING=$(gh pr view "${PR_NUMBER}" --repo "${REPO}" --json comments \
              --jq '[.comments[].body] | join("\n")' 2>/dev/null || echo "")
  if printf '%s\n' "${EXISTING}" | grep -qF "${DEDUP_MARKER}"; then
    echo ">>> Fallback comment already posted on PR #${PR_NUMBER}; skipping (idempotent)." >&2
    emit_json "idempotent_skip" 3
    exit 3
  fi
fi

# Step 3: 403 fallback. Build the comment via Python (Unicode + escaping
# safety; shell heredocs with \uXXXX escapes have bitten us before) and post it.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

python3 - "$PR_NUMBER" "$REPO" "$LIST" "$REVIEWER_LIST" "$DEDUP_MARKER" "$TMP" <<'PYEOF'
import sys
pr, repo, list_arg, reviewer_list, marker, out = sys.argv[1:7]
body = f"""{marker} (cross-fork token can't do this directly)

This PR is requesting review from **{reviewer_list}**, but the fork-bot token returns 403 on both `gh pr edit --add-reviewer` and REST `/requested_reviewers` (same constraint observed on PR #491).

If a maintainer with `{repo}` repo-write access runs the following, it formally requests tracking-reviewer notifications:

```bash
gh pr edit {pr} --add-reviewer {list_arg}
```

(`scripts/request-review.sh` is the source of this pattern; rerun it from an upstream-write-token env to convert the ping below into a formal review request.)
"""
with open(out, "w") as f:
    f.write(body)
PYEOF

run_gh gh pr comment "${PR_NUMBER}" --repo "${REPO}" --body-file "${TMP}" >&2
if [ "$DRY_RUN" -eq 0 ]; then
  echo ">>> Direct reviewer-request APIs blocked; posted fallback comment to PR #${PR_NUMBER}." >&2
  emit_json "fallback_posted" 2
  exit 2
else
  echo ">>> [dry-run] no comment was actually posted; re-run without --dry-run to post." >&2
  emit_json "dry_run_noop" 4
  exit 4
fi
