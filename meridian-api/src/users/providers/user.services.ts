import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { GetuserParamDto } from "src/DTO/userparamdto";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { CreateUserDto } from 'src/DTO/create-user.dto';
import { GetPostsParamDto } from 'src/DTO/postparamdto';
import { EditUserDto } from 'src/DTO/patch-user.dto';
import { CreateUserProvider } from './create-user.provider';
import { FindOneByEmail } from './find-one-by-email';
// import { Pagination } from "src/commom/pagination/Provider/pagination";
import { CreateManyUser } from './createManyUser.Provider';
import { CreateManyUsersDto } from '../dtos/createManyUserdto';
import { CreateUserBookProvider } from './createUserWithBook';

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
  ) {}
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
