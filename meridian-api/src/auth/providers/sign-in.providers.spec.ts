// Mock src/-aliased paths that Jest cannot resolve in CI
jest.mock('src/auth/dto/sign-in.dto', () => ({}), { virtual: true });
jest.mock('src/users/providers/user-auth.facade', () => ({}), {
  virtual: true,
});
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }), {
  virtual: true,
});
jest.mock('./token.provider', () => ({}), { virtual: true });
jest.mock('../config/jwt.config', () => ({}), { virtual: true });

import {
  ForbiddenException,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInProviders } from './sign-in.providers';

describe('SignInProviders', () => {
  let signIn: SignInProviders;
  let userAuthFacade: { findUserByEmail: jest.Mock };
  let hashingProvider: { comparePassword: jest.Mock };
  let generateTokenProvider: { generateTokens: jest.Mock };

  beforeEach(() => {
    userAuthFacade = {
      findUserByEmail: jest.fn(),
    };
    hashingProvider = {
      comparePassword: jest.fn(),
    };
    generateTokenProvider = {
      generateTokens: jest.fn(async () => ({
        accessToken: 'tok',
        refreshToken: 'ref',
      })),
    };

    signIn = new SignInProviders(
      userAuthFacade as any,
      hashingProvider as any,
      generateTokenProvider as any,
    );
  });

  it('returns tokens for a verified user with the correct password', async () => {
    userAuthFacade.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password: 'hashed',
      emailVerified: true,
    });
    hashingProvider.comparePassword.mockResolvedValue(true);

    const result = await signIn.SignIn({
      email: 'a@b.com',
      password: 'plain',
    } as any);

    expect(generateTokenProvider.generateTokens).toHaveBeenCalled();
    expect(result).toEqual([
      { accessToken: 'tok', refreshToken: 'ref' },
      { id: 1, email: 'a@b.com', password: 'hashed', emailVerified: true },
    ]);
  });

  it('throws UnauthorizedException when the password is wrong', async () => {
    userAuthFacade.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password: 'hashed',
      emailVerified: true,
    });
    hashingProvider.comparePassword.mockResolvedValue(false);

    await expect(
      signIn.SignIn({ email: 'a@b.com', password: 'wrong' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(generateTokenProvider.generateTokens).not.toHaveBeenCalled();
  });

  it('wraps hashing exceptions in a RequestTimeoutException', async () => {
    userAuthFacade.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password: 'hashed',
      emailVerified: true,
    });
    hashingProvider.comparePassword.mockRejectedValue(new Error('db-down'));

    await expect(
      signIn.SignIn({ email: 'a@b.com', password: 'plain' } as any),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  /**
   * Email verification gate (issue #435):
   * the 403 path lets clients render a useful "please verify first" message
   * without leaking account existence to attackers who guess passwords.
   */
  it('throws ForbiddenException (HTTP 403) when the email is not verified', async () => {
    userAuthFacade.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password: 'hashed',
      emailVerified: false,
    });
    hashingProvider.comparePassword.mockResolvedValue(true);

    await expect(
      signIn.SignIn({ email: 'a@b.com', password: 'plain' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(generateTokenProvider.generateTokens).not.toHaveBeenCalled();
  });

  it('checks the password BEFORE evaluating email verification', async () => {
    userAuthFacade.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password: 'hashed',
      emailVerified: false,
    });
    hashingProvider.comparePassword.mockResolvedValue(false);

    await expect(
      signIn.SignIn({ email: 'a@b.com', password: 'wrong' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
