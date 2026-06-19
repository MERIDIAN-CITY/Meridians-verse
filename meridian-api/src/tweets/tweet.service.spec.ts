jest.mock(
  './dto/tweet.entity',
  () => ({
    Tweet: class Tweet {},
  }),
  { virtual: true },
);

jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);
jest.mock(
  'src/users/providers/user.services',
  () => ({
    UserService: class UserService {},
  }),
  { virtual: true },
);

import { NotFoundException } from '@nestjs/common';
import { TweetService } from './tweet.service';
import { CreateTweetDto } from './dto/create-tweet.dto';

describe('TweetService', () => {
  const user = { id: 7 };
  let persistedTweets: any[];
  let tweetRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
  };
  let userService: {
    findOneById: jest.Mock;
  };
  let service: TweetService;

  beforeEach(() => {
    persistedTweets = [];

    tweetRepository = {
      create: jest.fn((tweet) => ({
        id: persistedTweets.length + 1,
        ...tweet,
      })),
      save: jest.fn(async (tweet) => {
        persistedTweets.push(tweet);
        return tweet;
      }),
      find: jest.fn(async ({ where }) =>
        persistedTweets.filter((tweet) => tweet.user.id === where.user.id),
      ),
      findOneBy: jest.fn(async ({ id }) =>
        persistedTweets.find((t) => t.id === id),
      ),
      delete: jest.fn(async ({ id }) => {
        persistedTweets = persistedTweets.filter((t) => t.id !== id);
        return { affected: 1 };
      }),
    };

    userService = {
      findOneById: jest.fn(async () => user),
    };

    service = new TweetService(tweetRepository as any, userService as any);
  });

  it('persists created tweet fields and returns them from getAllTweet', async () => {
    const createTweetDto: CreateTweetDto = {
      text: 'Launching Meridian today',
      image: 'https://example.com/tweet.png',
      userId: user.id,
    };

    await service.createTweet(createTweetDto);
    const tweets = await service.getAllTweet(user.id);

    expect(tweetRepository.create).toHaveBeenCalledWith({
      ...createTweetDto,
      user,
    });
    expect(tweets).toHaveLength(1);
    expect(tweets[0]).toMatchObject({
      text: createTweetDto.text,
      image: createTweetDto.image,
      user,
    });
  });

  describe('getAllTweet', () => {
    it('throws NotFoundException if the user does not exist', async () => {
      userService.findOneById.mockResolvedValueOnce(null);
      await expect(service.getAllTweet(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTweet', () => {
    it('saves a tweet with the resolved user', async () => {
      const dto: CreateTweetDto = {
        text: 'Hello there',
        userId: 7,
      };
      const tweet = await service.createTweet(dto);
      expect(userService.findOneById).toHaveBeenCalledWith(7);
      expect(tweetRepository.save).toHaveBeenCalled();
      expect(tweet).toMatchObject({ text: 'Hello there', user });
    });
  });

  describe('updateTweet', () => {
    it('updates and saves an existing tweet', async () => {
      await service.createTweet({ text: 'Original', userId: user.id });

      const updated = await service.updateTweet({ id: 1, text: 'Edited' });
      expect(tweetRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(updated).toMatchObject({ text: 'Edited' });
    });

    it('falls back to existing image when a blank string is provided', async () => {
      await service.createTweet({
        text: 'Original',
        image: 'old.png',
        userId: user.id,
      });

      const updated = await service.updateTweet({ id: 1, image: '' });
      expect(updated.image).toBe('old.png');
    });

    it('throws NotFoundException when the tweet does not exist', async () => {
      await expect(
        service.updateTweet({ id: 404, text: 'No tweet' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DeleteTweet', () => {
    it('removes the tweet by id and returns the deletion summary', async () => {
      await service.createTweet({ text: 'Doomed', userId: user.id });
      const result = await service.DeleteTweet(1);
      expect(tweetRepository.delete).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual({ deleted: true, id: 1 });
    });
  });
});
