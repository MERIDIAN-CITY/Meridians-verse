jest.mock('../user.entity', () => ({ User: class User {} }));
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
// VerificationTokenProvider is injected by CreateUserProvider so that
// every newly created account is issued a one-time SHA-256-hashed email
// verification token (issue #435).
jest.mock(
  'src/auth/providers/verification-token.provider',
  () => ({
    VERIFICATION_TTL_MS: 24 * 60 * 60 * 1000,
    VerificationTokenProvider: class VerificationTokenProvider {
      generate = jest.fn(() => 'raw-token-abc');
      hash = jest.fn(() => 'hashed-token-abc');
    },
  }),
  { virtual: true },
);
jest.mock('src/users/dto/create-user.dto', () => ({}), { virtual: true });

import { BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { CreateUserProvider } from './create-user.provider';

describe('CreateUserProvider (with email verification — issue #435)', () => {
  let provider: CreateUserProvider;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let hashingProvider: { hashPassword: jest.Mock };
  let mailService: { sendVerificationEmail: jest.Mock };
  let verificationTokens: {
    generate: jest.Mock;
    hash: jest.Mock;
  };

  const dto: any = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'plain-password',
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        id: 1,
        ...entity,
      })),
    };
    hashingProvider = { hashPassword: jest.fn(async () => 'hashed-password') };
    mailService = { sendVerificationEmail: jest.fn(async () => undefined) };
    verificationTokens = {
      generate: jest.fn(() => 'raw-token-abc'),
      hash: jest.fn(() => 'hashed-token-abc'),
    };

    provider = new CreateUserProvider(
      userRepository as any,
      hashingProvider as any,
      mailService as any,
      verificationTokens as any,
    );
  });

  it('hashes the password, persists the user, and sends the verification email', async () => {
    const result = await provider.createUsers(dto);

    expect(hashingProvider.hashPassword).toHaveBeenCalledWith('plain-password');
    expect(verificationTokens.generate).toHaveBeenCalled();
    expect(verificationTokens.hash).toHaveBeenCalledWith('raw-token-abc');
    expect(userRepository.create).toHaveBeenCalledWith({
      ...dto,
      password: 'hashed-password',
      emailVerified: false,
      verificationToken: 'hashed-token-abc',
      verificationTokenExpires: expect.any(Date),
    });
    expect(userRepository.save).toHaveBeenCalled();
    expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, email: dto.email }),
      'raw-token-abc',
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        email: dto.email,
        password: 'hashed-password',
      }),
    ]);
  });

  it('throws BadRequestException when the email is already taken', async () => {
    userRepository.findOne.mockResolvedValueOnce({ id: 9, email: dto.email });

    await expect(provider.createUsers(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(verificationTokens.generate).not.toHaveBeenCalled();
  });

  it('throws RequestTimeoutException when the lookup query fails', async () => {
    userRepository.findOne.mockRejectedValueOnce(new Error('connection lost'));

    await expect(provider.createUsers(dto)).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });

  it('throws RequestTimeoutException when saving the new user fails', async () => {
    userRepository.save.mockRejectedValueOnce(new Error('write failed'));

    await expect(provider.createUsers(dto)).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });

  it('still returns the user when sending the verification email fails', async () => {
    mailService.sendVerificationEmail.mockRejectedValueOnce(
      new Error('smtp down'),
    );

    const result = await provider.createUsers(dto);
    expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
