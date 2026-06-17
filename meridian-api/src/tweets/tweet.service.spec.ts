jest.mock('./dto/tweet.entity', () => ({
  Tweet: class Tweet {},
}));

jest.mock(
  'src/users/providers/user.services',
  () => ({
    UserService: class UserService {},
  }),
  { virtual: true },
);

import { TweetService } from './tweet.service';
import { CreateTweetDto } from './dto/create-tweet.dto';

describe('TweetService', () => {
  const user = { id: 7 };
  let persistedTweets: any[];
  let tweetRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
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
});
