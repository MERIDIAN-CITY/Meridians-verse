/**
 * Shared helpers for the DataResponseInterceptor e2e specs.
 *
 * Centralises the API_VERSION literal and the wire-shape matchers that
 * each per-controller spec asserts, so the suite stays in lockstep when
 * the contract changes (one file to update, not five).
 */

// The version literal that every envelope `apiversion` field must carry.
// Pre-#488 the interceptor hard-codes this inside a typo'd `apiversrion`
// literal; post-#488 it is exported as API_VERSION. Either way the wire
// shape on `main` today is '0.0.1', so the spec family locks against
// that constant here.
//
// DRIFT WARNING: if a future PR bumps the interceptor's API_VERSION
// export, this literal MUST be updated in lockstep, otherwise the
// envelope specs will silently lock the OLD value. A test failure on a
// same-major version bump is acceptable; a silent drift is not.
export const API_VERSION = '0.0.1';

/**
 * Asserts that a 2xx supertest response body conforms to the
 * `{ apiversion, result, data }` envelope. Uses `toMatchObject` (not
 * `toEqual`) so adding future optional envelope fields does not
 * cascade-test-fail.
 */
export function expectEnvelopeShape(
  body: unknown,
  expected: { result: number; data?: unknown },
): void {
  expect(body).toMatchObject({
    apiversion: API_VERSION,
    result: expected.result,
    ...(expected.data !== undefined ? { data: expected.data } : {}),
  });
}

/**
 * Asserts that a non-2xx (typically 4xx/5xx) supertest response body
 * is the Nest exception-filter JSON shape and NOT the envelope. Catches
 * future regressions that wrap errors inside the envelope.
 */
export function expectNoEnvelopeKeys(body: unknown): void {
  const obj = body as Record<string, unknown> | null | undefined;
  expect(obj).not.toBeNull();
  expect(obj).not.toHaveProperty('data');
  expect(obj).not.toHaveProperty('apiversion');
  expect(obj).not.toHaveProperty('result');
}
