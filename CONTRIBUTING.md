# Contributing to Meridians-verse

A few things worth knowing on day one:

- **Reviewer requests from a fork**: `make request-review ARGS="<PR_NUMBER> <REVIEWER_LOGIN> [<REVIEWER_LOGIN> ...]"` (or `bash scripts/request-review.sh --help` for full flag docs). Codifies the fork-PR + token-403 reviewer-request workflow that was hand-rolled on PRs #491 and #495 — see `scripts/request-review.sh` for the source of truth.
