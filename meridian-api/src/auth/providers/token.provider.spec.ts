jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('../entities/refresh-token.entity', () => ({
  RefreshToken: class RefreshToken {},
}));
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }));
jest.mock('../config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});

import { GenerateTokenProvider } from './token.provider';

describe('GenerateTokenProvider', () => {
  let provider: GenerateTokenProvider;
  let jwtService: { signAsync: jest.Mock };
  let refreshTokenRepository: { save: jest.Mock };
  let hashingProvider: { hashPassword: jest.Mock };

  const jwtConfig = {
    secret: 'secret',
    audience: 'aud',
    issuer: 'iss',
    ttl: 360,
    Rttl: 7200,
  };

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(
        async (payload, opts) =>
          `token:${payload.sub}:${opts.expiresIn}:${opts.audience}`,
      ),
    };
    refreshTokenRepository = { save: jest.fn(async (entity) => entity) };
    hashingProvider = { hashPassword: jest.fn(async () => 'token-hash') };

    provider = new GenerateTokenProvider(
      jwtService as any,
      jwtConfig as any,
      refreshTokenRepository as any,
      hashingProvider as any,
    );
  });

  describe('SignToken', () => {
    it('signs the token with the user id, payload, and jwt config', async () => {
      const token = await provider.SignToken(1, 360, { email: 'a@b.com' });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, email: 'a@b.com' },
        {
          secret: 'secret',
          audience: 'aud',
          issuer: 'iss',
          expiresIn: 360,
        },
      );
      expect(token).toBe('token:1:360:aud');
    });
  });

  describe('generateTokens', () => {
    it('mints access + refresh tokens and stores the refresh token', async () => {
      const user = { id: 5, email: 'a@b.com' } as any;

      const result = await provider.generateTokens(user);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(hashingProvider.hashPassword).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 5,
          tokenHash: 'token-hash',
          revokedAt: null,
        }),
      );
      expect(result).toMatchObject({
        access_token: expect.stringContaining(':5'),
        refresh_token: expect.stringContaining(':5'),
        jti: expect.any(String),
      });
    });
  });
});
