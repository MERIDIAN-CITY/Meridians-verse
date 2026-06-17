import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/DTO/create-user.dto';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingProvider } from 'src/auth/providers/hashing';
import { MailProvider } from 'src/mail/providers/mail.provider';

@Injectable()
export class CreateUserProvider {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,

    private readonly hashingProvider: HashingProvider,

    private readonly mailService: MailProvider,
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
    // Create the user
    let newUser = this.userRepository.create({
      ...createUserDto,
      password: await this.hashingProvider.hashPassword(createUserDto.password),
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
      await this.mailService.WelcomeEmail(newUser);
    } catch (error) {
      // throw new RequestTimeoutException('user already exist')
    }
    return [newUser];
  }
}
