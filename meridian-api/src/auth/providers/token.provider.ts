import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { User } from 'src/users/user.entity';

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

  public async generateTokens(user: User) {
    const [access_token, refresh_token] = await Promise.all([
      // generate access token
      this.SignToken(user.id, this.jwtconfiguration.ttl, { email: user.email }),

      // generate refresh token
      this.SignToken(user.id, this.jwtconfiguration.Rttl),
    ]);

    return { access_token, refresh_token };
  }
}
