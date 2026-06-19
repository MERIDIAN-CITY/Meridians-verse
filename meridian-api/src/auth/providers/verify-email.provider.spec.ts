// Mock src/-aliased paths that Jest cannot resolve in CI
jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/mail/providers/mail.provider', () => ({}), { virtual: true });

import { BadRequestException } from '@nestjs/common';
import { VerifyEmailProvider } from './verify-email.provider';
import { VerificationTokenProvider } from './verification-token.provider';

interface StoredUser {
  id: number;
  email: string;
  firstName: string;
  password: string;
  emailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpires: Date | null;
}

describe('VerifyEmailProvider', () => {
  let provider: VerifyEmailProvider;
  let tokens: VerificationTokenProvider;
  let repo: { findOne: jest.Mock; save: jest.Mock };
  let mail: { sendVerificationEmail: jest.Mock; WelcomeEmail: jest.Mock };
  let stored: StoredUser[];

  beforeEach(() => {
    tokens = new VerificationTokenProvider();
    stored = [];
    repo = {
      findOne: jest.fn(async ({ where }: { where: Partial<StoredUser> }) => {
        const entry = Object.entries(where)[0];
        if (!entry) return undefined;
        const [key, value] = entry as [
          keyof StoredUser,
          StoredUser[keyof StoredUser],
        ];
        return stored.find((u) => u[key] === value) ?? null;
      }),
      save: jest.fn(async (user: StoredUser) => {
        const idx = stored.findIndex((u) => u.id === user.id);
        if (idx >= 0) stored[idx] = user;
        else stored.push(user);
        return user;
      }),
    };
    mail = {
      sendVerificationEmail: jest.fn(async () => undefined),
      WelcomeEmail: jest.fn(async () => undefined),
    };

    provider = new VerifyEmailProvider(repo as any, tokens, mail as any);
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when token is missing', async () => {
      await expect(provider.verifyEmail('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws BadRequestException for an unknown token', async () => {
      await expect(
        provider.verifyEmail('no-such-token'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the user verified and clears the stored token on success', async () => {
      const raw = tokens.generate();
      const hashed = tokens.hash(raw);
      const user: StoredUser = {
        id: 1,
        email: 'a@b.com',
        firstName: 'a',
        password: 'h',
        emailVerified: false,
        verificationToken: hashed,
        verificationTokenExpires: new Date(Date.now() + 60_000),
      };
      stored.push(user);

      const result = await provider.verifyEmail(raw);

      expect(result).toEqual({ verified: true, email: 'a@b.com' });
      const saved = await repo.findOne({ where: { id: 1 } });
      expect(saved?.emailVerified).toBe(true);
      expect(saved?.verificationToken).toBeNull();
      expect(saved?.verificationTokenExpires).toBeNull();
      expect(mail.WelcomeEmail).toHaveBeenCalledWith(saved);
    });

    it('returns an idempotent response if the user is already verified', async () => {
      const raw = tokens.generate();
      const user: StoredUser = {
        id: 1,
        email: 'a@b.com',
        firstName: 'a',
        password: 'h',
        emailVerified: true,
        verificationToken: tokens.hash(raw),
        verificationTokenExpires: new Date(Date.now() + 60_000),
      };
      stored.push(user);

      const result = await provider.verifyEmail(raw);

      expect(result).toEqual({ alreadyVerified: true, email: 'a@b.com' });
      expect(repo.save).not.toHaveBeenCalled();
      expect(mail.WelcomeEmail).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an expired token', async () => {
      const raw = tokens.generate();
      const user: StoredUser = {
        id: 1,
        email: 'a@b.com',
        firstName: 'a',
        password: 'h',
        emailVerified: false,
        verificationToken: tokens.hash(raw),
        verificationTokenExpires: new Date(Date.now() - 1_000),
      };
      stored.push(user);

      await expect(provider.verifyEmail(raw)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('resendVerification', () => {
    it('returns a generic response when the email does not exist', async () => {
      const result = await provider.resendVerification('nope@example.com');
      expect(result).toEqual({ sent: false });
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('does not send mail if the account is already verified', async () => {
      const user: StoredUser = {
        id: 1,
        email: 'a@b.com',
        firstName: 'a',
        password: 'h',
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      };
      stored.push(user);

      const result = await provider.resendVerification('a@b.com');
      expect(result).toEqual({ sent: false });
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('rotates the stored hash, sets a new expiry, and sends an email', async () => {
      const user: StoredUser = {
        id: 1,
        email: 'a@b.com',
        firstName: 'a',
        password: 'h',
        emailVerified: false,
        verificationToken: 'old-hash',
        verificationTokenExpires: new Date(Date.now() - 1_000),
      };
      stored.push(user);

      const result = await provider.resendVerification('a@b.com');
      expect(result).toEqual({ sent: true });

      expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
      const [, rawToken] = mail.sendVerificationEmail.mock.calls[0];
      expect(typeof rawToken).toBe('string');
      expect(rawToken).not.toEqual('old-hash');

      const saved = await repo.findOne({ where: { id: 1 } });
      expect(saved?.verificationToken).toEqual(tokens.hash(rawToken));
      expect(saved?.verificationTokenExpires?.getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it('throws BadRequestException when the email is missing', async () => {
      await expect(provider.resendVerification('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
