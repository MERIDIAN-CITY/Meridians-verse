import { VerificationTokenProvider } from './verification-token.provider';

describe('VerificationTokenProvider', () => {
  let provider: VerificationTokenProvider;

  beforeEach(() => {
    provider = new VerificationTokenProvider();
  });

  describe('generate', () => {
    it('returns a non-empty hex string', () => {
      const token = provider.generate();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('returns a fresh value on each call', () => {
      const a = provider.generate();
      const b = provider.generate();
      expect(a).not.toEqual(b);
    });

    it('produces tokens of at least 64 hex chars (32 bytes)', () => {
      const token = provider.generate();
      expect(token.length).toBeGreaterThanOrEqual(64);
    });
  });

  describe('hash', () => {
    it('is deterministic for the same input', () => {
      const input = 'a-token';
      expect(provider.hash(input)).toEqual(provider.hash(input));
    });

    it('produces a different output for different inputs', () => {
      expect(provider.hash('a')).not.toEqual(provider.hash('b'));
    });

    it('is a 64-character SHA-256 hex digest', () => {
      const digest = provider.hash('hello');
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('verify', () => {
    it('returns true when the raw token matches the hash', () => {
      const raw = provider.generate();
      const hashed = provider.hash(raw);
      expect(provider.verify(raw, hashed)).toBe(true);
    });

    it('returns false when the raw token does not match the hash', () => {
      const raw = provider.generate();
      const hashed = provider.hash(raw);
      expect(provider.verify('not-the-token', hashed)).toBe(false);
    });

    it('returns false for empty raw token', () => {
      expect(provider.verify('', provider.hash('something'))).toBe(false);
    });

    it('returns false for empty stored hash', () => {
      expect(provider.verify('any-token', '')).toBe(false);
    });
  });
});
