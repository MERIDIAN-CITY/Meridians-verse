import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

/** Verification links expire after 24 hours. */
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generates, hashes, and verifies short-lived opaque tokens used for
 * email verification. Tokens are SHA-256 hashed before being stored so
 * a database dump alone cannot be used to verify accounts.
 */
@Injectable()
export class VerificationTokenProvider {
  /**
   * Generate a cryptographically random, URL-safe token.
   * Returns a 64-character hex string (32 random bytes).
   */
  public generate(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Produce a deterministic SHA-256 hash of a raw token.
   * This is stored in the database so a leaked DB cannot reveal
   * any active verification URLs.
   */
  public hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Constant-time comparison of a raw token against a stored hash.
   * Provided as a utility for cases where the hash is already loaded
   * (e.g., a single-row lookup that returned a user object).
   */
  public verify(rawToken: string, storedHash: string): boolean {
    if (!rawToken || !storedHash) {
      return false;
    }
    const computed = this.hash(rawToken);
    if (computed.length !== storedHash.length) {
      return false;
    }
    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
