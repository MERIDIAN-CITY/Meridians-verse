import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignInDto } from 'src/DTO/signin-dto';
import { SignInProviders } from './sign-in.providers';
import { RefreshTokenDto } from '../dto/refresh-token-dto';
import { RefreshTokenProvider } from './refreshToken.provider';
import { RefreshTokensService } from './refresh-tokens.service';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    //intra dependency injection of sigin Providers
    private readonly signInProviders: SignInProviders,

    private readonly refreshTokenProvider: RefreshTokenProvider,

    private readonly refreshTokensService: RefreshTokensService,

    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  public async SignIn(signInDto: SignInDto, userAgent?: string) {
    // find user in database by email
    return await this.signInProviders.SignIn(signInDto, userAgent);
  }

  public async RefreshToken(
    refreshTokendto: RefreshTokenDto,
    userAgent?: string,
  ) {
    return await this.refreshTokenProvider.refreshToken(
      refreshTokendto,
      userAgent,
    );
  }

  public async logout(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );

      const { jti } = payload;
      await this.refreshTokensService.revokeToken(jti);

      return { message: 'Successfully logged out' };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  public async logoutAll(userId: number) {
    await this.refreshTokensService.revokeAllUserTokens(userId);
    return { message: 'Successfully logged out from all devices' };
  }
}
