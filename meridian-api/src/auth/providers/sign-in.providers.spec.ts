jest.mock(
  'src/users/providers/user-auth.facade',
  () => ({ UserAuthFacade: class UserAuthFacade {} }),
  { virtual: true },
);
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock('src/DTO/signin-dto', () => ({}), { virtual: true });
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }));
jest.mock('./token.provider', () => ({
  GenerateTokenProvider: class GenerateTokenProvider {},
}));
jest.mock('../config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});

import { RequestTimeoutException, UnauthorizedException } from '@nestjs/common';
import { SignInProviders } from './sign-in.providers';

describe('SignInProviders', () => {
  let provider: SignInProviders;
  let userAuthFacade: { findUserByEmail: jest.Mock };
  let hashingProvider: { comparePassword: jest.Mock };
  let generateTokenProvider: { generateTokens: jest.Mock };

  const user = { id: 1, email: 'a@b.com', password: 'hashed' };

  beforeEach(() => {
    userAuthFacade = {
      findUserByEmail: jest.fn(async () => user),
    };
    hashingProvider = {
      comparePassword: jest.fn(async () => true),
    };
    generateTokenProvider = {
      generateTokens: jest.fn(async () => ({
        access_token: 'a',
        refresh_token: 'r',
        jti: 'j',
      })),
    };

    provider = new SignInProviders(
      userAuthFacade as any,
      hashingProvider as any,
      generateTokenProvider as any,
    );
  });

  it('returns the tokens and user on successful sign-in', async () => {
    const tokens = await provider.SignIn({
      email: 'a@b.com',
      password: 'plain',
    } as any);

    expect(userAuthFacade.findUserByEmail).toHaveBeenCalledWith('a@b.com');
    expect(hashingProvider.comparePassword).toHaveBeenCalledWith(
      'plain',
      user.password,
    );
    expect(generateTokenProvider.generateTokens).toHaveBeenCalledWith(user);
    expect(tokens).toEqual([
      { access_token: 'a', refresh_token: 'r', jti: 'j' },
      user,
    ]);
  });

  it('throws UnauthorizedException when the password does not match', async () => {
    hashingProvider.comparePassword.mockResolvedValueOnce(false);

    await expect(
      provider.SignIn({ email: 'a@b.com', password: 'wrong' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(generateTokenProvider.generateTokens).not.toHaveBeenCalled();
  });

  it('wraps hashing errors in a RequestTimeoutException', async () => {
    hashingProvider.comparePassword.mockRejectedValueOnce(new Error('boom'));

    await expect(
      provider.SignIn({ email: 'a@b.com', password: 'plain' } as any),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });
});
