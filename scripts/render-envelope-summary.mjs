#!/usr/bin/env node
/**
 * render-envelope-summary.mjs
 *
 * Writes a small Markdown section to stdout suitable for embedding
 * in `$GITHUB_STEP_SUMMARY`. Mirrors the structure of the PR comment
 * posted by `envelope-lock-ci.yml` but stays compact (counts + 5
 * worst offenders) so the run page stays scannable.
 *
 * Usage:
 *   node render-envelope-summary.mjs <classified.json> >> "$GITHUB_STEP_SUMMARY"
 */

import { readFileSync } from 'node:fs';

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error('usage: render-envelope-summary.mjs <classified.json>');
    process.exit(2);
  }
  const c = JSON.parse(readFileSync(inputPath, 'utf8'));
  const { expected, unexpected, total, passed, failed } = c.summary;
  const status = unexpected === 0
    ? '✅ **No real regressions.**'
    : `❌ **${unexpected} unexpected failure(s) — likely real regressions.**`;

  const worstExpected = c.expectedFailures.slice(0, 5).map(f => `- \`${f.title}\` — _${f.suite}_`).join('\n');
  const worstUnexpected = c.unexpectedFailures.slice(0, 5).map(f => `- \`${f.title}\` — _${f.suite}_`).join('\n');

  process.stdout.write([
    '## Envelope Regression Lock CI',
    '',
    status,
    '',
    `- Expected-by-design failures (lock firing): **${expected}**`,
    `- Unexpected failures (real regressions): **${unexpected}**`,
    `- Total assertions: ${total} · Passed: ${passed} · Failed: ${failed}`,
    '',
    expected > 0
      ? `### Worst expected-by-design failures (top 5)\n\n${worstExpected}\n`
      : '',
    unexpected > 0
      ? `### Worst unexpected failures (top 5) — INVESTIGATE\n\n${worstUnexpected}\n`
      : '',
    expected > 0
      ? '_Re-baseline this branch against `main` after PR #488 lands to turn these green._'
      : '',
  ].filter(Boolean).join('\n'));
}

main();
