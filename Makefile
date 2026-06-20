# Top-level Makefile for the Meridians-verse monorepo.
#
# Day-one entry points:
#   make help                  list available recipes with one-line descriptions
#   make request-review ...    ping a reviewer on an open fork PR (see below)
#
# The `request-review` recipe codifies the fork-PR + token-403 reviewer-request
# workaround that was hand-rolled on PRs #491 and #495; the underlying script
# itself is the source of truth -- see `bash scripts/request-review.sh --help`
# for full flag/usage docs.

.DEFAULT_GOAL := help
.PHONY: help request-review

help: ## List available recipes
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Pass ARGS straight through to the script. Flags must precede positional
# args (a script-level convention documented in its header), e.g.:
#   make request-review ARGS="495 Qoder-Undefined"
#   make request-review ARGS="--dry-run --report-json 495 Qoder-Undefined"
request-review: ## Ping a reviewer on an open PR (e.g. make request-review ARGS="495 Qoder-Undefined")
	@bash scripts/request-review.sh $(ARGS)
