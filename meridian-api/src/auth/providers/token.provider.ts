import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { HashingProvider } from './hashing';
import { randomUUID } from 'crypto';

// seperation of concern
// this was generated to create access token and refresh token so we can use in signInProvider

@Injectable()
export class GenerateTokenProvider {
  constructor(
    // jwtService injecion
    private readonly jwtService: JwtService,

    // jwt config injecion
    @Inject(jwtConfig.KEY)
    private readonly jwtconfiguration: ConfigType<typeof jwtConfig>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    private readonly hashingProvider: HashingProvider,
  ) {}

  // we want to generate to types of token which need payload
  //payload for access {id,ttl,email} and refresh{id,ttl}
  public async SignToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: this.jwtconfiguration.secret,
        audience: this.jwtconfiguration.audience,
        issuer: this.jwtconfiguration.issuer,
        expiresIn,
      },
    );
  }

  public async generateTokens(user: User, existingFamilyJti?: string) {
    const jti = randomUUID();
    const familyJti = existingFamilyJti || jti;

    const [access_token, refresh_token] = await Promise.all([
      // generate access token
      this.SignToken(user.id, this.jwtconfiguration.ttl, { email: user.email }),

      // generate refresh token
      this.SignToken(user.id, this.jwtconfiguration.Rttl, { jti, familyJti }),
    ]);

    await this.refreshTokenRepository.save({
      jti,
      familyJti,
      userId: user.id,
      tokenHash: await this.hashingProvider.hashPassword(refresh_token),
      expiresAt: new Date(Date.now() + this.jwtconfiguration.Rttl * 1000),
      revokedAt: null,
      userAgent: null,
      isRevoked: false,
    });

    return { access_token, refresh_token, jti, familyJti };
  }
}
