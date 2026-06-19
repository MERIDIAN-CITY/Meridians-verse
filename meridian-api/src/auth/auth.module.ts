import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { HashingProvider } from 'src/auth/providers/hashing';
import { BcryptProvider } from './providers/bcrypt';
import { SignInProviders } from './providers/sign-in.providers';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { GenerateTokenProvider } from './providers/token.provider';
import { RefreshTokenProvider } from './providers/refreshToken.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from 'src/users/user.entity';
import { VerificationTokenProvider } from './providers/verification-token.provider';
import { VerifyEmailProvider } from './providers/verify-email.provider';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    TypeOrmModule.forFeature([RefreshToken, User]),
  ],
  providers: [
    AuthService,
    GenerateTokenProvider,
    RefreshTokenProvider,
    { provide: HashingProvider, useClass: BcryptProvider },
    SignInProviders,
    VerificationTokenProvider,
    VerifyEmailProvider,
  ],
  controllers: [AuthController],
  exports: [AuthService, HashingProvider, VerificationTokenProvider],
})
export class AuthModule {}
