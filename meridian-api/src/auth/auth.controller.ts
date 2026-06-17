import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { SignInDto } from 'src/DTO/signin-dto';
import { RefreshTokenDto } from './dto/refresh-token-dto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from './guard/access-token/access-token.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sign-in')
  @Throttle({ default: { limit: 5, ttl: 15000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with user credentials' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated, returns access token and refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid credentials',
  })
  public async signIn(@Body() signInDto: SignInDto, @Request() req: any) {
    const userAgent = req.headers['user-agent'] || undefined;
    return this.authService.SignIn(signInDto, userAgent);
  }

  @Post('/refresh-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Auth Token' })
  @ApiResponse({ status: 200, description: 'Successfully refreshed token' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Limit 10 attempts per minute',
  })
  @ApiOperation({ summary: 'Refresh active JWT access tokens' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated new tokens',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid refresh token',
  })
  public refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any,
  ) {
    const userAgent = req.headers['user-agent'] || undefined;
    return this.authService.RefreshToken(refreshTokenDto, userAgent);
  }

  @Post('/logout')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto);
  }

  @Post('/logout-all')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out from all devices',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async logoutAll(@Request() req: any) {
    return this.authService.logoutAll(req.user.sub);
  }
}
