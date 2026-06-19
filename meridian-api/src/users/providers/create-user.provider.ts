import {
  BadRequestException,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingProvider } from 'src/auth/providers/hashing';
import { MailProvider } from 'src/mail/providers/mail.provider';
import {
  VERIFICATION_TTL_MS,
  VerificationTokenProvider,
} from 'src/auth/providers/verification-token.provider';

@Injectable()
export class CreateUserProvider {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,

    private readonly hashingProvider: HashingProvider,

    private readonly mailService: MailProvider,

    private readonly verificationTokens: VerificationTokenProvider,
  ) {}
  public async createUsers(createUserDto: CreateUserDto) {
    // check if user already exits
    let existingUser = undefined;

    try {
      existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });
    } catch (error) {
      // you might save/log your  error
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        {
          description: 'Error connecting to your database',
          cause: 'the user is using has a badnetwork',
        },
      );
    }
    // Handle Error
    if (existingUser) {
      throw new BadRequestException('User already exist');
    }

    // Generate a one-time verification token to send in the welcome email.
    const verificationToken = this.verificationTokens.generate();

    // Create the user
    let newUser = this.userRepository.create({
      ...createUserDto,
      password: await this.hashingProvider.hashPassword(createUserDto.password),
      emailVerified: false,
      verificationToken: this.verificationTokens.hash(verificationToken),
      verificationTokenExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
    });
    try {
      newUser = await this.userRepository.save(newUser);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        {
          description: 'Error connecting to your database',
          cause: 'the user is using Glo network',
        },
      );
    }

    try {
      await this.mailService.sendVerificationEmail(newUser, verificationToken);
    } catch (error) {
      // Mail failures must not roll back the account creation; the user
      // can request a fresh verification email via /auth/resend-verification.
    }
    return [newUser];
  }
}
