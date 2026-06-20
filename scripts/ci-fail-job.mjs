#!/usr/bin/env node
/**
 * ci-fail-job.mjs
 *
 * Tiny standalone Node script for the GitHub Actions workflow's
 * fail-job step. Reads the classified envelope-lock output and
 * decides whether to turn the workflow red or green.
 *
 * Environment:
 *   CLASSIFIED_FILE  Path to the JSON output of
 *                    scripts/classify-envelope-results.mjs (REQUIRED).
 *
 * Exit codes:
 *   0  — every failure was classified as expected-by-design (lock
 *        firing against pre-#488 main). Job passes by design.
 *   1  — either jest crashed (numTotalTests == 0 / invalid JSON) OR
 *        at least one failure was classified as unexpected (real
 *        regression outside the regression-lock describe block).
 *
 * The `::error::` prefix on the stderr lines is picked up by the GH
 * Actions runner and rendered in the workflow run UI as a red
 * annotation; the message after `::error::` becomes the annotation
 * title.
 */

import { readFileSync } from 'node:fs';

const file = process.env.CLASSIFIED_FILE;
if (!file) {
  console.error('env var CLASSIFIED_FILE is required');
  process.exit(2);
}

let classified;
try {
  classified = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`::error::Envelope lock CI: cannot read classified output at ${file}: ${err.message}`);
  process.exit(1);
}

if (classified.summary && classified.summary.crashed) {
  console.error(
    '::error::Envelope lock CI: jest run produced no usable output. Treating as a crash.',
  );
  process.exit(1);
}

if (
  !classified.summary ||
  typeof classified.summary.unexpected !== 'number'
) {
  console.error(
    '::error::Envelope lock CI: classified output missing summary.unexpected field.',
  );
  process.exit(1);
}

if (classified.summary.unexpected !== 0) {
  console.error(
    `::error::Envelope lock CI detected ${classified.summary.unexpected} unexpected failure(s) outside the issue #426 regression lock.`,
  );
  process.exit(1);
}

console.log('All failures match the regression-lock pattern. Job passes by design.');
console.log(
  `Expected-by-design failures: ${classified.summary.expected}. Total assertions: ${classified.summary.total}.`,
);
