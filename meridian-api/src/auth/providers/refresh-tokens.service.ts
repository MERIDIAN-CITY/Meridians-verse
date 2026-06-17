import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../refresh-token.entity';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async createRefreshToken(
    jti: string,
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const refreshToken = this.refreshTokenRepository.create({
      jti,
      userId,
      tokenHash,
      expiresAt,
      userAgent,
    });
    return this.refreshTokenRepository.save(refreshToken);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({ where: { jti } });
  }

  async revokeToken(jti: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { jti },
      { revokedAt: new Date() },
    );
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const token = await this.findByJti(jti);
    return token ? token.revokedAt !== null : true;
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
