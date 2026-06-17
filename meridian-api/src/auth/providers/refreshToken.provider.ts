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
import { UserService } from 'src/users/providers/user.services';
import { GenerateTokenProvider } from './token.provider';
import { RefreshTokensService } from './refresh-tokens.service';
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

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,

    private readonly refreshTokensService: RefreshTokensService,

    private readonly hashingProvider: HashingProvider,
  ) {}

  public async refreshToken(
    refreshTokendto: RefreshTokenDto,
    userAgent?: string,
  ) {
    try {
      // validate refreshtoken using jwtService
      const payload = await this.jwtService.verifyAsync(
        refreshTokendto.refreshToken,
        {
          secret: this.jwtconfiguration.secret,
          audience: this.jwtconfiguration.audience,
          issuer: this.jwtconfiguration.issuer,
        },
      );

      const { sub, jti } = payload;

      // Check if token exists in database and is not revoked
      const storedToken = await this.refreshTokensService.findByJti(jti);

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (storedToken.revokedAt) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Verify the token hash matches
      const isHashValid = await this.hashingProvider.comparePassword(
        refreshTokendto.refreshToken,
        storedToken.tokenHash,
      );

      if (!isHashValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date() > storedToken.expiresAt) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // grab(find) the user from the database
      const user = await this.userService.findOneId(sub);

      // Revoke the old token
      await this.refreshTokensService.revokeToken(jti);

      // generate new token pair
      const tokens = await this.generateTokenProvider.generateTokens(user);

      // Decode the new refresh token to get its jti
      const newPayload = await this.jwtService.verifyAsync(
        tokens.refresh_token,
        {
          secret: this.jwtconfiguration.secret,
          audience: this.jwtconfiguration.audience,
          issuer: this.jwtconfiguration.issuer,
        },
      );

      // Calculate expiration date for the new refresh token
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.jwtconfiguration.Rttl);

      // Hash the new refresh token
      const tokenHash = await this.hashingProvider.hashPassword(
        tokens.refresh_token,
      );

      // Store the new refresh token in database
      await this.refreshTokensService.createRefreshToken(
        newPayload.jti,
        user.id,
        tokenHash,
        expiresAt,
        userAgent,
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }
}
