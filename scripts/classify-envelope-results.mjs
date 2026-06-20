#!/usr/bin/env node
/**
 * classify-envelope-results.mjs
 *
 * Reads jest --json output from `envelope-lock-ci.yml` and classifies
 * every failing assertion as one of:
 *
 *   - "expected"      — at least one of the assertion's
 *                       `ancestorTitles` matches the regression-lock
 *                       describe pattern. The lock is firing by
 *                       design against the pre-#488 main branch; the
 *                       failure will turn green once #488 lands and
 *                       the workflow's base branch is rebased.
 *
 *   - "unexpected"    — the failure happens OUTSIDE the regression
 *                       lock. This is a real regression to investigate.
 *
 * Usage:
 *   node classify-envelope-results.mjs <input-jest-json> <output-json>
 *
 * Exit code is always 0; the workflow decides pass/fail via the
 * follow-up `Fail the job on real regression OR jest crash` step so
 * the workflow's PR-comment + summary steps still run on
 * expected-only failures.
 */

import { readFileSync, writeFileSync } from 'node:fs';

// Match any describe(...) whose label contains this sentinel. The
// envelope regression-lock specs all use the exact pattern.
// We match against the fullName OR any ancestorTitles entry to be
// resilient to either newer or older jest output formats.
const LOCK_DESCRIBE_SENTINEL = /issue\s*#\s*426\s+regression\s+lock/i;

// Keep enough of the failure message to retain the Expected/Received
// diff that jest prints (typically 5-8 lines), but bounded so the PR
// comment table doesn't blow up.
const MAX_FAILURE_LINES = 5;
const MAX_REASON_CHARS = 600;

function isLockFail(title, ancestorTitles) {
  const haystack = [title, ...(ancestorTitles || [])].join(' | ');
  return LOCK_DESCRIBE_SENTINEL.test(haystack);
}

function trimReason(failureMessages) {
  if (!Array.isArray(failureMessages) || failureMessages.length === 0) {
    return '<no failure message>';
  }
  const joined = failureMessages
    .slice(0, MAX_FAILURE_LINES)
    .join('\n')
    .trim();
  if (joined.length === 0) return '<no failure message>';
  if (joined.length <= MAX_REASON_CHARS) return joined;
  return joined.slice(0, MAX_REASON_CHARS) + '…';
}

function classify(jestReport) {
  // Crash detection — distinguish "no tests ran" from "tests ran and
  // some failed". numTotalTests===0 means ts-jest or jest.setup.ts
  // crashed before any test was discovered; not the same as
  // "everything passed".
  const crashed = !jestReport || typeof jestReport !== 'object'
    || !Array.isArray(jestReport.testResults)
    || jestReport.numTotalTests === 0
    || jestReport.numTotalTests === undefined;

  const expectedFailures = [];
  const unexpectedFailures = [];
  let totalAssertions = 0;
  let totalFailures = 0;
  let totalPassed = 0;

  if (!crashed) {
    for (const testFile of jestReport.testResults) {
      const suite = testFile.name || '<unknown>';
      for (const assertion of testFile.assertionResults || []) {
        totalAssertions += 1;
        if (assertion.status === 'passed') {
          totalPassed += 1;
          continue;
        }
        if (assertion.status !== 'failed') continue;
        totalFailures += 1;

        const title =
          assertion.fullName || assertion.title || '<unnamed>';
        const ancestorTitles = assertion.ancestorTitles || [];
        const reason = trimReason(assertion.failureMessages);

        const entry = {
          suite,
          title,
          ancestorTitles,
          reason,
        };

        if (isLockFail(title, ancestorTitles)) {
          expectedFailures.push(entry);
        } else {
          unexpectedFailures.push(entry);
        }
      }
    }
  }

  return {
    crashed,
    expectedFailures,
    unexpectedFailures,
    summary: {
      crashed,
      expected: expectedFailures.length,
      unexpected: unexpectedFailures.length,
      total: totalAssertions,
      passed: totalPassed,
      failed: totalFailures,
    },
  };
}

function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error(
      'usage: classify-envelope-results.mjs <input-jest-json> <output-json>',
    );
    process.exit(2);
  }
  let report;
  try {
    report = JSON.parse(readFileSync(inputPath, 'utf8'));
  } catch (err) {
    // Treat parse failure as a crash so the workflow surfaces it via
    // `summary.crashed=true` instead of returning empty zeros (which
    // would otherwise produce a falsely-green checkmark).
    const crashedOutput = {
      crashed: true,
      expectedFailures: [],
      unexpectedFailures: [],
      summary: {
        crashed: true,
        expected: 0,
        unexpected: 0,
        total: 0,
        passed: 0,
        failed: 0,
      },
      parseError: err.message,
    };
    writeFileSync(outputPath, JSON.stringify(crashedOutput, null, 2));
    console.log(
      '[classify-envelope] CRASHED; failed to parse input JSON: ' +
        err.message,
    );
    return;
  }
  const classified = classify(report);
  writeFileSync(outputPath, JSON.stringify(classified, null, 2));
  // One-line machine-parseable summary on stdout for log scrapers.
  console.log(
    `[classify-envelope] crashed=${classified.summary.crashed} ` +
      `expected=${classified.summary.expected} ` +
      `unexpected=${classified.summary.unexpected} ` +
      `total=${classified.summary.total} ` +
      `passed=${classified.summary.passed} ` +
      `failed=${classified.summary.failed}`,
  );
}

main();
