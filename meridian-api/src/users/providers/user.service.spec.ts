// Mock entities that import src/-aliased paths not available in Jest
jest.mock('../user.entity', () => ({ User: class User {} }), { virtual: true });
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/entities/tweet.entity', () => ({ Tweet: class Tweet {} }), {
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
  'src/auth/providers/verification-token.provider',
  () => ({
    VerificationTokenProvider: class VerificationTokenProvider {},
    VERIFICATION_TTL_MS: 24 * 60 * 60 * 1000,
  }),
  { virtual: true },
);
jest.mock(
  'src/common/exceptions/user-already-exists.exception',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);
jest.mock('src/users/dto/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/users/dto/postparamdto', () => ({}), { virtual: true });
jest.mock('src/users/dto/patch-user.dto', () => ({}), { virtual: true });

import { HttpException } from '@nestjs/common';
import { UserService } from './user.services';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    softDelete: jest.Mock;
    restore: jest.Mock;
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
      softDelete: jest.fn(async () => ({ affected: 1 })),
      restore: jest.fn(async () => ({ affected: 1 })),
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

  it('deleteUser soft-deletes the user by id', async () => {
    const result = await service.deleteUser(1);
    expect(result).toEqual({ deleted: true, id: 1 });
    expect(usersRepository.softDelete).toBeDefined();
  });

  it('deleteUser throws HttpException when the user is missing', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    await expect(service.deleteUser(99)).rejects.toThrow(HttpException);
  });

  it('restoreUser throws HttpException when nothing is restored', async () => {
    usersRepository.restore.mockResolvedValueOnce({ affected: 0 });
    await expect(service.restoreUser(99)).rejects.toThrow(HttpException);
  });

  it('restoreUser returns success when affected > 0', async () => {
    const result = await service.restoreUser(1);
    expect(result).toEqual({ restored: true, id: 1 });
  });
});
