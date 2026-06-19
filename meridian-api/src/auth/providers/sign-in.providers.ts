import {
  ForbiddenException,
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto } from 'src/auth/dto/sign-in.dto';
import { UserAuthFacade } from 'src/users/providers/user-auth.facade';
import { HashingProvider } from './hashing';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { GenerateTokenProvider } from './token.provider';

@Injectable()
export class SignInProviders {
  constructor(
    private readonly userAuthFacade: UserAuthFacade,

    //intra dependcy injection of hash provider
    private readonly hashingProvider: HashingProvider,

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  public async SignIn(signInDto: SignInDto) {
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

    // Block sign-in for accounts that have not verified their email yet.
    // Returning 403 (instead of 401) lets clients render a useful message:
    // "Please verify your email before signing in."
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email not verified. Please check your inbox and follow the verification link before signing in.',
      );
    }

    const token = await this.generateTokenProvider.generateTokens(user);
    return [token, user];
  }
}
