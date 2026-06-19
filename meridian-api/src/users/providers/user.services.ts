import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { GetPostsParamDto } from 'src/post/dto/post-param.dto';
import { EditUserDto } from '../dto/patch-user.dto';
import { CreateUserProvider } from './create-user.provider';
import { FindOneByEmail } from './find-one-by-email';
import { CreateManyUser } from './createManyUser.Provider';
import { CreateManyUsersDto } from '../dto/create-many-users.dto';
import { CreateUserBookProvider } from './createUserWithBook';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,

    //dependecy injection for createUser Provider
    private readonly createuserprovider: CreateUserProvider,

    //dependecy injection for findoneByemail Provider
    private readonly findOneByemail: FindOneByEmail,

    private readonly createUserWithBooks: CreateUserBookProvider,

    // depedency injection of createManyUsers
    private readonly createManyUserService: CreateManyUser,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) { }
  // repository pattern that help commiunicate with the Database
  // just by doing this we have injected a repository pattern

  public findAll(
    getUserParamDto: GetPostsParamDto,
    limit: number,
    page: number,
  ): Promise<User[]> {
    return this.usersRepository.find();
  }

  // inject Hasingprovider

  public async createUsers(createUserDto: CreateUserDto) {
    return this.createuserprovider.createUsers(createUserDto);
  }

  public async GetOneByEmail(email: string) {
    //fineoneby email first one is provider second a method in the provider
    return await this.findOneByemail.findOneByEmail(email);
  }

  public async deleteUser() {
    throw new HttpException(
      {
        status: HttpStatus.TEMPORARY_REDIRECT,
        error: 'User has been removed',
      },
      HttpStatus.TEMPORARY_REDIRECT,
    );
  }

  //finding users by id and userservice was exported in postmodule i.e export:[typeorm,userservice]
  public async findOneId(id: number): Promise<User | null> {
    const cacheKey = `user:${id}`;

    // 1. Attempt to get the user from cache first
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Fallback to database query
    const user = await this.usersRepository.findOneBy({ id });

    // 3. Throw formatted error if user is missing
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} not found`,
          table: 'User',
        },
        HttpStatus.NOT_FOUND,
        {
          description: `User with the given id ${id} was not found`,
        },
      );
    }

    // 4. Cache the result for 300 seconds (5 minutes) before returning
    await this.cacheManager.set(cacheKey, user, 300);

    return user;
  }

  // editing user
  public async editUser(edituserDto: EditUserDto) {
    const edit = await this.usersRepository.findOneBy({
      id: edituserDto.id,
    });

    edit.firstName = edituserDto.firstName ?? edit.firstName;
    edit.lastName = edituserDto.lastName ?? edit.lastName;
    edit.password = edituserDto.password ?? edit.password;
    edit.email = edituserDto.email ?? edit.email;

    return this.usersRepository.save(edit);
  }

  public async createMany(createManyUserDto: CreateManyUsersDto) {
    return await this.createManyUserService.manyUsers(createManyUserDto);
  }

  //PRACTCE FOR ONE TO ONE RELATIONSHIP BTW USER AND BOOK ENTITY
  public async createUserWithBook(userDto: CreateUserDto) {
    return await this.createUserWithBooks.createUserwithBook(userDto);
  }

  public async getAllUserWithBook() {
    return await this.createUserWithBooks.getAllUserWithBook();
  }

  public async findOneById(id: number) {
    return await this.usersRepository.findOneBy({ id });
  }
}
