jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock('../entities/refresh-token.entity', () => ({
  RefreshToken: class RefreshToken {},
}));
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }));
jest.mock('./token.provider', () => ({
  GenerateTokenProvider: class GenerateTokenProvider {},
}));
jest.mock('../config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});
jest.mock('../dto/refresh-token-dto', () => ({}), { virtual: true });

import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenProvider } from './refreshToken.provider';

describe('RefreshTokenProvider', () => {
  let provider: RefreshTokenProvider;
  let userService: { findOneId: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let refreshTokenRepository: {
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
  };
  let hashingProvider: {
    hashPassword: jest.Mock;
    comparePassword: jest.Mock;
  };
  let generateTokenProvider: { generateTokens: jest.Mock };

  const jwtConfig = {
    secret: 'secret',
    audience: 'aud',
    issuer: 'iss',
    ttl: 360,
    Rttl: 7200,
  };

  const user = { id: 1, email: 'a@b.com' };
  const familyJti = 'family-jti-1';
  const storedToken = {
    jti: 'jti-1',
    familyJti,
    userId: user.id,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    isRevoked: false,
  };

  beforeEach(() => {
    userService = { findOneId: jest.fn(async () => user) };
    jwtService = {
      verifyAsync: jest.fn(async () => ({
        sub: user.id,
        jti: storedToken.jti,
        familyJti,
      })),
    };
    refreshTokenRepository = {
      findOne: jest.fn(async ({ where }) =>
        where.jti === storedToken.jti ? storedToken : null,
      ),
      update: jest.fn(async () => undefined),
      save: jest.fn(async (entity) => ({ id: 'new-id', ...entity })),
    };
    hashingProvider = {
      hashPassword: jest.fn(async () => 'hashed-new'),
      comparePassword: jest.fn(async () => true),
    };
    generateTokenProvider = {
      generateTokens: jest.fn(async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        jti: 'new-jti',
        familyJti,
      })),
    };

    provider = new RefreshTokenProvider(
      userService as any,
      jwtService as any,
      jwtConfig as any,
      refreshTokenRepository as any,
      hashingProvider as any,
      generateTokenProvider as any,
    );
  });

  describe('refreshToken', () => {
    it('rotates refresh + access tokens on a valid request', async () => {
      const result = await provider.refreshToken({
        refreshToken: 'valid',
      } as any);

      expect(jwtService.verifyAsync).toHaveBeenCalled();
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { jti: storedToken.jti, userId: user.id },
      });
      expect(hashingProvider.comparePassword).toHaveBeenCalled();
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: storedToken.jti, userId: user.id },
        { revokedAt: expect.any(Date), isRevoked: true },
      );
      expect(generateTokenProvider.generateTokens).toHaveBeenCalledWith(user, familyJti);
      expect(result).toEqual({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      });
    });

    it('revokes entire family and throws when token is already revoked', async () => {
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        isRevoked: true,
      });

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { familyJti, userId: user.id },
        { revokedAt: expect.any(Date), isRevoked: true },
      );
    });

    it('throws UnauthorizedException when the stored token is revoked', async () => {
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        revokedAt: new Date(),
      });

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the stored token is expired', async () => {
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('revokes entire family and throws when the token hash does not match', async () => {
      hashingProvider.comparePassword.mockResolvedValueOnce(false);

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { familyJti, userId: user.id },
        { revokedAt: expect.any(Date), isRevoked: true },
      );
    });

    it('throws UnauthorizedException when verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad token'));

      await expect(
        provider.refreshToken({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the payload sub is invalid', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'not-a-number',
        jti: 'x',
        familyJti,
      });

      await expect(
        provider.refreshToken({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the stored refresh token on success', async () => {
      const result = await provider.logout({ refreshToken: 'valid' } as any);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: storedToken.jti, userId: user.id },
        { revokedAt: expect.any(Date), isRevoked: true },
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('throws UnauthorizedException when verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('expired'));
      await expect(
        provider.logout({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logoutAll', () => {
    it('revokes all non-revoked tokens for the user', async () => {
      const result = await provider.logoutAll(user.id);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: user.id, revokedAt: null },
        { revokedAt: expect.any(Date), isRevoked: true },
      );
      expect(result).toEqual({ message: 'All sessions revoked successfully' });
    });
  });
});
