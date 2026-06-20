#!/usr/bin/env node
/**
 * ci-post-pr-comment.mjs
 *
 * Posts (or updates, on re-run) the envelope regression-lock PR-comment
 * annotation. Lives outside `envelope-lock-ci.yml` so the workflow stays
 * small and the GitHub API logic is unit-testable in isolation.
 *
 * Environment:
 *   CLASSIFIED_FILE  Path to the JSON output of
 *                    scripts/classify-envelope-results.mjs (REQUIRED).
 *   GITHUB_TOKEN     GitHub API token, supplied automatically by the
 *                    runner (this script does not embed or read user
 *                    secrets).
 *   GITHUB_REPOSITORY  "owner/repo" string.
 *   GITHUB_SHA       Commit SHA being validated.
 *   GITHUB_RUN_ID    Numeric workflow run id.
 *   GITHUB_WORKFLOW  Workflow file name (for the comment header).
 *   GITHUB_EVENT_PATH  Path to the JSON event payload on disk; we read
 *                    it to derive issue_number.
 *   GITHUB_SERVER_URL  Base URL (gh.{com}/ enterprise), used to build
 *                    run links.
 *
 * Behaviour:
 *   - Lists existing bot-authored comments, finds the one prefaced with
 *     `<!-- envelope-lock-ci -->` and updates it; otherwise creates a
 *     new comment. Maintains idempotency across re-runs.
 *   - On 403 (fork PR, restricted token), logs and exits 0 so the
 *     workflow does not turn red on a write-permission denial; the
 *     `$GITHUB_STEP_SUMMARY` still surfaces the classification in the
 *     workflow run page.
 *   - On any other error, re-throws so the workflow step turns red.
 */

import {
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REQUIRED = ['CLASSIFIED_FILE', 'GITHUB_REPOSITORY', 'GITHUB_EVENT_PATH'];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error(`env var ${k} is required`);
    process.exit(2);
  }
}

let classified;
try {
  classified = JSON.parse(
    readFileSync(process.env.CLASSIFIED_FILE, 'utf8'),
  );
} catch (err) {
  console.error(`::error::ci-post-pr-comment: cannot read classified output: ${err.message}`);
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const runId = process.env.GITHUB_RUN_ID;
const workflow = process.env.GITHUB_WORKFLOW;
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';

let event;
try {
  event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
} catch (err) {
  console.error(`::error::ci-post-pr-comment: cannot read event payload: ${err.message}`);
  process.exit(1);
}

const issueNumber =
  (event.pull_request && event.pull_request.number) ||
  (event.issue && event.issue.number);

if (!issueNumber) {
  core.info('No PR/issue context. Skipping PR-comment annotation.');
  process.exit(0);
}

// Tiny inline `core`-shaped logger so the script stays standalone
// (no @actions/core import). `info` writes to STDOUT so the GH runner
// picks it up under the job log section.
const core = {
  info: (m) => console.log(`[envelope-lock-ci] ${m}`),
  warning: (m) => console.log(`::warning::[envelope-lock-ci] ${m}`),
  error: (m) => console.log(`::error::[envelope-lock-ci] ${m}`),
};

const body = renderCommentBody(classified, { sha, runId, workflow, repo, serverUrl });
const marker = '<!-- envelope-lock-ci -->';
const fullBody = `${marker}\n${body}`;

// Write the body to a temp file and POST/PATCH via `-F body=@file`.
// This avoids `gh api -f body=...` form-encoding the entire payload,
// which silently truncates large bodies (a 5–10 KB Markdown PR-comment
// is common once envelope classification tables mature).
const bodyFile = join(tmpdir(), `envelope-comment-${runId}.md`);
writeFileSync(bodyFile, fullBody, 'utf8');

// Always remove the temp body file before exiting, success or failure.
const cleanupBodyFile = () => {
  try {
    unlinkSync(bodyFile);
  } catch {
    // Best-effort cleanup; ignore ENOENT and perms errors.
  }
};

// `stdio: 'inherit'` lets gh's own stdout/stderr stream into the GH
// step log live (so debugging a real `gh api` failure surfaces the
// actual command output). On success we capture stdout into a string
// for parsing; on failure the err object carries stderr/stdout we log
// in the catch block.
const ghOpts = { stdio: ['ignore', 'pipe', 'inherit'] };

try {
  const listOut = execFileSync(
    'gh',
    ['api', `repos/${repo}/issues/${issueNumber}/comments?per_page=100`],
    { ...ghOpts, encoding: 'utf8' },
  );
  const allComments = JSON.parse(listOut) || [];
  const botComments = allComments.filter(
    (c) => c.user && c.user.login === 'github-actions[bot]',
  );
  const existing = botComments.find(
    (c) => typeof c.body === 'string' && c.body.startsWith(marker),
  );
  if (existing) {
    execFileSync(
      'gh',
      [
        'api',
        '--method',
        'PATCH',
        `repos/${repo}/issues/comments/${existing.id}`,
        '-F',
        `body=@${bodyFile}`,
      ],
      ghOpts,
    );
    core.info(`Updated existing envelope-lock comment: id=${existing.id}`);
  } else {
    execFileSync(
      'gh',
      [
        'api',
        '--method',
        'POST',
        `repos/${repo}/issues/${issueNumber}/comments`,
        '-F',
        `body=@${bodyFile}`,
      ],
      ghOpts,
    );
    core.info('Created new envelope-lock comment.');
  }
  cleanupBodyFile();
} catch (err) {
  try {
    // Surface the full gh stderr (capped) so the GH step log makes a
    // real failure diagnosable from the workflow UI alone.
    const stderrBlob = String(
      (err && err.stderr && err.stderr.toString()) || err.message || '',
    )
      .trim()
      .slice(0, 600);
    const stdoutBlob = String(
      (err && err.stdout && err.stdout.toString()) || '',
    )
      .trim()
      .slice(0, 600);
    if (stdoutBlob) console.log(`[gh-stdout]\n${stdoutBlob}`);
    if (stderrBlob) console.log(`[gh-stderr]\n${stderrBlob}`);
  } catch {
    // Ignore cascading diagnostics failures.
  }
  cleanupBodyFile();

  // gh surfaces HTTP failures via non-zero exit + stderr; we look at
  // both `status` (added by some wrappers) and the stderr text for
  // the canonical "403" marker. Fork PRs and restricted-token repos
  // fall in this bucket; treat as soft-fail.
  const msg = String(
    (err && err.stderr && err.stderr.toString()) || err.message || '',
  );
  if (msg.includes('403') || err.status === 403) {
    core.warning(
      `PR-comment operation denied (status=403, likely fork PR or restricted token). Annotation skipped; run summary still posted.`,
    );
    process.exit(0);
  }
  // Real failure: re-throw so the job step turns red.
  core.error(`gh api call failed (status=${err.status ?? 'unknown'}). See stderr above.`);
  throw err;
}

function renderCommentBody(c, ctx) {
  const { summary, expectedFailures, unexpectedFailures } = c;
  const shortSha = ctx.sha.slice(0, 7);
  const runLink = `${ctx.serverUrl}/${ctx.repo}/actions/runs/${ctx.runId}`;
  const header =
    summary.unexpected === 0
      ? '✅ **Envelope Regression Lock — no real regressions detected**'
      : `❌ **Envelope Regression Lock — ${summary.unexpected} unexpected failure(s)**`;
  const lockNote =
    summary.expected > 0
      ? `\n> The **${summary.expected} expected-by-design failures** are the lock for [issue #426](https://github.com/${ctx.repo}/issues/426) firing against the pre-[#488](https://github.com/${ctx.repo}/pull/488) \`main\` branch. They turn green once #488 is merged on \`main\` and this PR is rebased. **Only the *Unexpected* table below signals real regressions.**\n`
      : '';
  return [
    header,
    lockNote,
    `Suite: \`${ctx.workflow}\` · SHA: \`${shortSha}\` · [Run #${ctx.runId}](${runLink})`,
    '',
    '## Expected (lock firing by design)',
    summary.expected === 0
      ? '_None — all envelope specs passing._'
      : renderTable(expectedFailures),
    '',
    '## Unexpected (real regressions)',
    summary.unexpected === 0
      ? '_None — ✅_'
      : renderTable(unexpectedFailures),
    '',
    `<sub>Updated by run \`${ctx.runId}\`. Next re-run will replace this comment in place.</sub>`,
  ].join('\n');

  function renderTable(rows) {
    if (rows.length === 0) return '_None._';
    const header = '| Test | Suite | Reason |';
    const sep = '| --- | --- | --- |';
    const body = rows
      .slice(0, 50)
      .map((r) => {
        const safeTitle = r.title.replace(/\|/g, '\\|');
        const safeReason = (r.reason || '').replace(/\|/g, '\\|');
        return `| \`${safeTitle}\` | \`${r.suite}\` | ${safeReason} |`;
      })
      .join('\n');
    const overflow =
      rows.length > 50
        ? `\n\n_…and ${rows.length - 50} more. See the workflow run link above for the full list._`
        : '';
    return [header, sep, body, overflow].join('\n');
  }
}
