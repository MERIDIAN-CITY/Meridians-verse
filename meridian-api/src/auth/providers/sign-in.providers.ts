import {
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { SignInDto } from 'src/DTO/signin-dto';
import { UserAuthFacade } from 'src/users/providers/user-auth.facade';
import { HashingProvider } from './hashing';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { GenerateTokenProvider } from './token.provider';
import { RefreshTokensService } from './refresh-tokens.service';

@Injectable()
export class SignInProviders {
  constructor(
    private readonly userAuthFacade: UserAuthFacade,

    //intra dependcy injection of hash provider
    private readonly hashingProvider: HashingProvider,

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,

    private readonly refreshTokensService: RefreshTokensService,

    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  public async SignIn(signInDto: SignInDto, userAgent?: string) {
    // find user by email
    const user = await this.userAuthFacade.findUserByEmail(signInDto.email);

    //compare the password to the hashed password
    let isEqual: boolean = false;
    try {
      isEqual = await this.hashingProvider.comparePassword(
        signInDto.password,
        user.password,
      );
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'error connecting to database',
      });
    }

    //send a confirmation
    if (!isEqual) {
      throw new UnauthorizedException('password/email is wrong');
    }

    const token = await this.generateTokenProvider.generateTokens(user);

    // Decode the refresh token to get its jti
    const payload = await this.jwtService.verifyAsync(token.refresh_token, {
      secret: this.jwtConfiguration.secret,
      audience: this.jwtConfiguration.audience,
      issuer: this.jwtConfiguration.issuer,
    });

    // Calculate expiration date for the refresh token
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.jwtConfiguration.Rttl);

    // Hash the refresh token before storing
    const tokenHash = await this.hashingProvider.hashPassword(
      token.refresh_token,
    );

    // Store the refresh token in database
    await this.refreshTokensService.createRefreshToken(
      payload.jti,
      user.id,
      tokenHash,
      expiresAt,
      userAgent,
    );

    return [token, user];
  }
}
