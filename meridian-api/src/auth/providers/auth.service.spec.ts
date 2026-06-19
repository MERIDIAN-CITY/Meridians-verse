// Mock all transitive src/-aliased paths that Jest can't resolve
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
jest.mock('src/auth/dto/sign-in.dto', () => ({}), { virtual: true });
jest.mock('src/users/dto/create-user.dto', () => ({}), { virtual: true });
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }), {
  virtual: true,
});
jest.mock(
  './token.provider',
  () => ({ GenerateTokenProvider: class GenerateTokenProvider {} }),
  { virtual: true },
);
jest.mock('../dto/refresh-token-dto', () => ({}), { virtual: true });
jest.mock(
  'src/users/providers/create-user.provider',
  () => ({
    CreateUserProvider: class CreateUserProvider {},
    VERIFICATION_TTL_MS: 24 * 60 * 60 * 1000,
  }),
  { virtual: true },
);
jest.mock('./verify-email.provider', () => ({}), { virtual: true });

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let signInProviders: { SignIn: jest.Mock };
  let refreshTokenProvider: {
    refreshToken: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
  };
  let createUserProvider: { createUsers: jest.Mock };
  let verifyEmailProvider: {
    verifyEmail: jest.Mock;
    resendVerification: jest.Mock;
  };

  beforeEach(() => {
    signInProviders = { SignIn: jest.fn(async () => ({ accessToken: 'tok' })) };
    refreshTokenProvider = {
      refreshToken: jest.fn(async () => ({ accessToken: 'new-tok' })),
      logout: jest.fn(async () => ({ success: true })),
      logoutAll: jest.fn(async () => ({ success: true })),
    };
    createUserProvider = {
      createUsers: jest.fn(async () => [{ id: 1, email: 'a@b.com' }]),
    };
    verifyEmailProvider = {
      verifyEmail: jest.fn(async () => ({ verified: true, email: 'a@b.com' })),
      resendVerification: jest.fn(async () => ({ sent: true })),
    };

    service = new AuthService(
      signInProviders as any,
      refreshTokenProvider as any,
      createUserProvider as any,
      verifyEmailProvider as any,
    );
  });

  it('SignIn delegates to signInProviders', async () => {
    const dto = { email: 'a@b.com', password: 'pass' } as any;
    const result = await service.SignIn(dto);
    expect(signInProviders.SignIn).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'tok' });
  });

  it('signUp delegates to createUserProvider and reports emailSent', async () => {
    const dto = { email: 'a@b.com', password: 'Pass1!' } as any;
    const result = await service.signUp(dto);
    expect(createUserProvider.createUsers).toHaveBeenCalledWith(dto);
    expect(result).toEqual(
      expect.objectContaining({
        emailSent: true,
      }),
    );
    expect(typeof result.expiresInSeconds).toBe('number');
  });

  it('verifyEmail delegates to verifyEmailProvider', async () => {
    const result = await service.verifyEmail('raw-token');
    expect(verifyEmailProvider.verifyEmail).toHaveBeenCalledWith('raw-token');
    expect(result).toEqual({ verified: true, email: 'a@b.com' });
  });

  it('resendVerification returns a generic acknowledgement with no info leak', async () => {
    verifyEmailProvider.resendVerification.mockResolvedValueOnce({
      sent: true,
    });
    const result: any = await service.resendVerification('a@b.com');
    expect(verifyEmailProvider.resendVerification).toHaveBeenCalledWith(
      'a@b.com',
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
    // The service MUST NOT expose the internal `sent` flag to callers,
    // otherwise an attacker can enumerate which emails are registered.
    expect(result).not.toHaveProperty('sent');
  });

  it('resendVerification returns the same generic ack when no email was sent', async () => {
    verifyEmailProvider.resendVerification.mockResolvedValueOnce({
      sent: false,
    });
    const result: any = await service.resendVerification('nobody@example.com');
    expect(result.status).toBe('ok');
    expect(result).not.toHaveProperty('sent');
  });

  it('RefreshToken delegates to refreshTokenProvider with the DTO', async () => {
    const dto = { refreshToken: 'token' } as any;
    const result = await service.RefreshToken(dto);
    expect(refreshTokenProvider.refreshToken).toHaveBeenCalledWith(
      dto,
      undefined,
    );
    expect(result).toEqual({ accessToken: 'new-tok' });
  });

  it('logout delegates to refreshTokenProvider', async () => {
    const dto = { refreshToken: 'token' } as any;
    const result = await service.logout(dto);
    expect(refreshTokenProvider.logout).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ success: true });
  });

  it('logoutAll delegates to refreshTokenProvider', async () => {
    const userId = 1;
    const result = await service.logoutAll(userId);
    expect(refreshTokenProvider.logoutAll).toHaveBeenCalledWith(userId);
    expect(result).toEqual({ success: true });
  });
});
