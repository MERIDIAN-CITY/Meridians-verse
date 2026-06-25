import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { EditUserDto } from '../dto/patch-user.dto';
import { CreateUserProvider } from './create-user.provider';
import { FindOneByEmail } from './find-one-by-email';
import { CreateManyUser } from './createManyUser.Provider';
import { CreateManyUsersDto } from '../dto/create-many-users.dto';
import { CreateUserBookProvider } from './createUserWithBook';
import { GetuserParamDto } from '../dto/user-param.dto';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

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

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  // repository pattern that help commiunicate with the Database
  // just by doing this we have injected a repository pattern

  public async findAll(
    _getuserParamDto: GetuserParamDto,
    _limit: number,
    _page: number,
  ): Promise<User[]> {
    const cachedUsers = await this.cacheManager.get<User[]>('users_all');
    if (cachedUsers) {
      return cachedUsers;
    }
    const users = await this.usersRepository.find();
    await this.cacheManager.set('users_all', users, 300);
    return users;
  }

  // inject Hasingprovider

  public async createUsers(createUserDto: CreateUserDto) {
    const user = await this.createuserprovider.createUsers(createUserDto);
    await this.cacheManager.del('users_all');
    return user;
  }

  public async GetOneByEmail(email: string) {
    const cachedUser = await this.cacheManager.get<User>(`user_email_${email}`);
    if (cachedUser) {
      return cachedUser;
    }
    const user = await this.findOneByemail.findOneByEmail(email);
    if (user) {
      await this.cacheManager.set(`user_email_${email}`, user, 600);
      await this.cacheManager.set(`user_${user.id}`, user, 600);
    }
    return user;
  }

  /**
   * Soft-deletes a user (issue #427). TypeORM will hide the row from
   * subsequent `find*` queries; use `restoreUser` to undo.
   */
  public async deleteUser(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.usersRepository.softDelete(id);
    await this.cacheManager.del(`user_${id}`);
    await this.cacheManager.del('users_all');

    return { deleted: true, id };
  }

  /**
   * Restores a soft-deleted user, clearing its `deletedAt` value.
   */
  public async restoreUser(id: number) {
    const result = await this.usersRepository.restore(id);

    if (!result.affected) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} was not found or is not soft-deleted`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.cacheManager.del(`user_${id}`);

    return { restored: true, id };
  }

  //finding users by id and userservice was exported in postmodule i.e export:[typeorm,userservice]
  public async findOneId(id: number): Promise<User | null> {
    const cachedUser = await this.cacheManager.get<User>(`user_${id}`);
    if (cachedUser) {
      return cachedUser;
    }
    const user = await this.usersRepository.findOneBy({ id });

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

    await this.cacheManager.set(`user_${id}`, user, 600);
    return user;
  }

  // editing user
  public async editUser(edituserDto: EditUserDto) {
    const edit = await this.usersRepository.findOneBy({
      id: edituserDto.id,
    });

    if (!edit) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${edituserDto.id} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    edit.firstName = edituserDto.firstName ?? edit.firstName;
    edit.lastName = edituserDto.lastName ?? edit.lastName;
    edit.password = edituserDto.password ?? edit.password;
    edit.email = edituserDto.email ?? edit.email;

    const updatedUser = await this.usersRepository.save(edit);
    await this.cacheManager.del(`user_${edituserDto.id}`);
    await this.cacheManager.del('users_all');
    if (edituserDto.email) {
      await this.cacheManager.del(`user_email_${edit.email}`);
    }
    return updatedUser;
  }

  public async createMany(createManyUserDto: CreateManyUsersDto) {
    const users = await this.createManyUserService.manyUsers(createManyUserDto);
    await this.cacheManager.del('users_all');
    return users;
  }

  //PRACTCE FOR ONE TO ONE RELATIONSHIP BTW USER AND BOOK ENTITY
  public async createUserWithBook(userDto: CreateUserDto) {
    const user = await this.createUserWithBooks.createUserwithBook(userDto);
    await this.cacheManager.del('users_all');
    return user;
  }

  public async getAllUserWithBook() {
    return await this.createUserWithBooks.getAllUserWithBook();
  }

  public async findOneById(id: number) {
    return await this.usersRepository.findOneBy({ id });
  }
}
