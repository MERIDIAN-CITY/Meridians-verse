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
jest.mock('src/DTO/signin-dto', () => ({}), { virtual: true });
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }), {
  virtual: true,
});
jest.mock(
  './token.provider',
  () => ({ GenerateTokenProvider: class GenerateTokenProvider {} }),
  { virtual: true },
);
jest.mock('../dto/refresh-token-dto', () => ({}), { virtual: true });

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let signInProviders: { SignIn: jest.Mock };
  let refreshTokenProvider: { refreshToken: jest.Mock };

  beforeEach(() => {
    signInProviders = { SignIn: jest.fn(async () => ({ accessToken: 'tok' })) };
    refreshTokenProvider = {
      refreshToken: jest.fn(async () => ({ accessToken: 'new-tok' })),
    };

    service = new AuthService(
      signInProviders as any,
      refreshTokenProvider as any,
    );
  });

  it('SignIn delegates to signInProviders', async () => {
    const dto = { email: 'a@b.com', password: 'pass' } as any;
    const result = await service.SignIn(dto);
    expect(signInProviders.SignIn).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'tok' });
  });
});
