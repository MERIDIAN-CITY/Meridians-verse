// Mock entities that import src/-aliased paths not available in Jest
jest.mock('../user.entity', () => ({ User: class User {} }), { virtual: true });
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});
jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/mail/providers/mail.provider',
  () => ({ MailProvider: class MailProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/commom/userAlreadyExistException',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-user.dto', () => ({}), { virtual: true });

import { HttpException } from '@nestjs/common';
import { UserService } from './user.services';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
  };
  let createuserprovider: { createUsers: jest.Mock };
  let findOneByemail: { findOneByEmail: jest.Mock };
  let createUserWithBooks: {
    createUserwithBook: jest.Mock;
    getAllUserWithBook: jest.Mock;
  };
  let createManyUserService: { manyUsers: jest.Mock };

  const mockUser = {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hashed',
  };

  beforeEach(() => {
    usersRepository = {
      find: jest.fn(async () => [mockUser]),
      findOneBy: jest.fn(async () => mockUser),
      save: jest.fn(async (u) => u),
    };
    createuserprovider = { createUsers: jest.fn(async () => [mockUser]) };
    findOneByemail = { findOneByEmail: jest.fn(async () => mockUser) };
    createUserWithBooks = {
      createUserwithBook: jest.fn(async () => mockUser),
      getAllUserWithBook: jest.fn(async () => [mockUser]),
    };
    createManyUserService = { manyUsers: jest.fn(async () => [mockUser]) };

    service = new UserService(
      usersRepository as any,
      createuserprovider as any,
      findOneByemail as any,
      createUserWithBooks as any,
      createManyUserService as any,
    );
  });

  it('findAll returns users from repository', async () => {
    const result = await service.findAll({} as any, 10, 1);
    expect(result).toEqual([mockUser]);
    expect(usersRepository.find).toHaveBeenCalled();
  });

  it('createUsers delegates to createuserprovider', async () => {
    const dto = {
      email: 'jane@example.com',
      password: 'pass',
      firstName: 'Jane',
      lastName: 'Doe',
    } as any;
    const result = await service.createUsers(dto);
    expect(createuserprovider.createUsers).toHaveBeenCalledWith(dto);
    expect(result).toEqual([mockUser]);
  });

  it('GetOneByEmail delegates to findOneByemail', async () => {
    const result = await service.GetOneByEmail('jane@example.com');
    expect(findOneByemail.findOneByEmail).toHaveBeenCalledWith(
      'jane@example.com',
    );
    expect(result).toEqual(mockUser);
  });

  it('findOneId returns user when found', async () => {
    const result = await service.findOneId(1);
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(result).toEqual(mockUser);
  });

  it('findOneId throws NOT_FOUND when user is missing', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOneId(99)).rejects.toThrow(HttpException);
  });

  it('editUser saves updated user', async () => {
    const dto = { id: 1, firstName: 'Updated' } as any;
    await service.editUser(dto);
    expect(usersRepository.save).toHaveBeenCalled();
  });

  it('deleteUser throws HttpException', async () => {
    await expect(service.deleteUser()).rejects.toThrow(HttpException);
  });
});
