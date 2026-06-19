import { Injectable } from '@nestjs/common';
import { SignInDto } from 'src/auth/dto/sign-in.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { SignInProviders } from './sign-in.providers';
import { RefreshTokenDto } from '../dto/refresh-token-dto';
import { RefreshTokenProvider } from './refreshToken.provider';
import { CreateUserProvider } from 'src/users/providers/create-user.provider';
import { VERIFICATION_TTL_MS } from './verification-token.provider';
import { VerifyEmailProvider } from './verify-email.provider';

@Injectable()
export class AuthService {
  constructor(
    //intra dependency injection of sigin Providers
    private readonly signInProviders: SignInProviders,

    private readonly refreshTokenProvider: RefreshTokenProvider,

    // CreateUserProvider is exported by UsersModule, which AuthModule already
    // imports via forwardRef, so no class-level forwardRef wrapper is needed.
    private readonly createUserProvider: CreateUserProvider,

    private readonly verifyEmailProvider: VerifyEmailProvider,
  ) {}

  public async SignIn(signInDto: SignInDto) {
    // find user in database by email
    return await this.signInProviders.SignIn(signInDto);
  }

  /**
   * Account creation: delegates to the users provider which now generates a
   * one-time verification token and dispatches the templated email.
   */
  public async signUp(createUserDto: CreateUserDto) {
    await this.createUserProvider.createUsers(createUserDto);
    return {
      emailSent: true,
      // Exposed so client/devops can audit the TTL without reading source.
      expiresInSeconds: Math.floor(VERIFICATION_TTL_MS / 1000),
      message:
        'Verification email sent. Please check your inbox and follow the link to activate your account.',
    };
  }

  public async verifyEmail(token: string) {
    return this.verifyEmailProvider.verifyEmail(token);
  }

  public async resendVerification(email: string) {
    // The internal `sent` flag is intentionally suppressed so callers cannot
    // differentiate "account exists & unverified" from "no account here".
    await this.verifyEmailProvider.resendVerification(email);
    return {
      status: 'ok',
      message:
        'If that email belongs to an unverified account, a new verification email has been sent.',
    };
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

  public async logout(refreshTokendto: RefreshTokenDto) {
    return await this.refreshTokenProvider.logout(refreshTokendto);
  }

  public async logoutAll(userId: number) {
    return await this.refreshTokenProvider.logoutAll(userId);
  }
}
