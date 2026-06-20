import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token-dto';
import { LogoutDto } from './dto/logout.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from './guard/access-token/access-token.guard';
import { REQUEST_USER_KEY } from './constant/auth-constant';
import { Request } from 'express';
import { ApiEnvelopeResponse } from 'src/common/decorators/api-envelope-response.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sign-in')
  @Throttle({ default: { limit: 5, ttl: 15000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with user credentials' })
  @ApiEnvelopeResponse({
    dataExample: {
      accessToken: 'eyJhbGciOi...',
      refreshToken: 'rt_abc123',
    },
    description:
      'Successfully authenticated; returns access token and refresh token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid credentials',
  })
  public async signIn(@Body() signInDto: SignInDto) {
    return this.authService.SignIn(signInDto);
  }

  @Post('/refresh-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Auth Token' })
  @ApiEnvelopeResponse({
    dataExample: { accessToken: 'eyJhbGciOi...' },
    description: 'Successfully refreshed token.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Limit 10 attempts per minute',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid refresh token',
  })
  public async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const userAgent = req.get('user-agent') ?? undefined;
    return this.authService.RefreshToken(refreshTokenDto, userAgent);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiEnvelopeResponse({
    dataExample: { revoked: true },
    description: 'Successfully revoked refresh token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid refresh token',
  })
  public async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto);
  }

  @Post('/logout-all')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  @ApiEnvelopeResponse({
    dataExample: { revokedAll: true, count: 3 },
    description: 'Successfully revoked all sessions.',
  })
  public async logoutAll(@Req() req: Request) {
    const user = req[REQUEST_USER_KEY] as { sub?: string | number };
    const userId = Number(user?.sub);

    if (!Number.isFinite(userId)) {
      throw new Error('Invalid user payload');
    }

    return this.authService.logoutAll(userId);
  }

  @Post('/verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email with one-time token from signup mail',
  })
  @ApiEnvelopeResponse({
    dataExample: { verified: true, email: 'user@example.com' },
    description: 'Email verified.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification token',
  })
  public async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(verifyEmailDto.token);
    return { verified: true, email: user.email };
  }

  @Post('/resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the email verification mail' })
  @ApiEnvelopeResponse({
    dataExample: { accepted: true },
    description:
      'Acknowledgement — never reveals whether the email is registered.',
  })
  public async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerification(resendVerificationDto.email);
  }
}
