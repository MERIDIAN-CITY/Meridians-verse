import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshTokenDto } from '../dto/refresh-token-dto';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from 'src/users/providers/user.services';
import { GenerateTokenProvider } from './token.provider';
import { RefreshToken } from '../entities/refresh-token.entity';
import { HashingProvider } from './hashing';

@Injectable()
export class RefreshTokenProvider {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly jwtService: JwtService,

    // jwt config injecion
    @Inject(jwtConfig.KEY)
    private readonly jwtconfiguration: ConfigType<typeof jwtConfig>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    private readonly hashingProvider: HashingProvider,

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  private async revokeFamily(familyJti: string, userId: number) {
    await this.refreshTokenRepository.update(
      { familyJti, userId },
      { revokedAt: new Date(), isRevoked: true },
    );
  }

  public async refreshToken(
    refreshTokendto: RefreshTokenDto,
    userAgent?: string,
  ) {
    try {
      const payload = await this.jwtService.verifyAsync(
        refreshTokendto.refreshToken,
        {
          secret: this.jwtconfiguration.secret,
          audience: this.jwtconfiguration.audience,
          issuer: this.jwtconfiguration.issuer,
        },
      );

      const { sub, jti, familyJti } = payload;
      const userId = Number(sub);

      if (!Number.isFinite(userId) || !familyJti) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      const user = await this.userService.findOneId(userId);

      const storedToken = await this.refreshTokenRepository.findOne({
        where: { jti, userId: user.id },
      });

      if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.isRevoked ||
        storedToken.expiresAt <= new Date()
      ) {
        // If we have a familyJti and the token is revoked or not found, revoke the entire family as a safety measure
        await this.revokeFamily(familyJti, userId);
        throw new UnauthorizedException(
          'Refresh token has been revoked or expired',
        );
      }

      const isValid = await this.hashingProvider.comparePassword(
        refreshTokendto.refreshToken,
        storedToken.tokenHash,
      );

      if (!isValid) {
        await this.revokeFamily(familyJti, userId);
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Token is valid - first use, mark as revoked and generate new token
      await this.refreshTokenRepository.update(
        { jti, userId: user.id },
        { revokedAt: new Date(), isRevoked: true },
      );

      const tokens = await this.generateTokenProvider.generateTokens(
        user,
        familyJti,
      );

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        error instanceof Error ? error.message : error,
      );
    }
  }

  public async logout(refreshTokendto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(
        refreshTokendto.refreshToken,
        {
          secret: this.jwtconfiguration.secret,
          audience: this.jwtconfiguration.audience,
          issuer: this.jwtconfiguration.issuer,
        },
      );

      const { sub, jti, familyJti } = payload;
      const userId = Number(sub);

      if (!Number.isFinite(userId)) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      const user = await this.userService.findOneId(userId);

      await this.refreshTokenRepository.update(
        { jti, userId: user.id },
        { revokedAt: new Date(), isRevoked: true },
      );

      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : error,
      );
    }
  }

  public async logoutAll(userId: number) {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date(), isRevoked: true },
    );

    return { message: 'All sessions revoked successfully' };
  }
}
