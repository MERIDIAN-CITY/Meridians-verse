/**
 * E2E regression lock for issue #426 (fixed in #488), TweetController slice.
 *
 * Compiles a real Nest testing app with:
 *   - the actual `DataResponseInterceptor` registered as APP_INTERCEPTOR
 *   - the actual `TweetController`
 *   - a mocked `TweetService` whose return values are deterministic
 * and asserts that every route shape (single object, array, null) is
 * wrapped in the `{ apiversion, result, data }` envelope and the
 * response is never a 500 due to a TypeError in the interceptor.
 *
 * If a future refactor re-introduces raw `data.length` access (or any
 * other shape-breaking transformation), this spec fails loudly at the
 * HTTP layer on the tweets routes.
 *
 * Run with `npm run test:e2e`.
 */

import { INestApplication, NotFoundException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import {
  API_VERSION,
  expectEnvelopeShape,
  expectNoEnvelopeKeys,
} from './helpers/envelope-assert.helper';
import { DataResponseInterceptor } from '../src/common/interceptors/data-response.interceptor';
import { TweetController } from '../src/tweets/tweet.controller';
import { TweetService } from '../src/tweets/tweet.service';

// jest.setup.ts (wired in via jest-e2e.json `setupFiles`) already stubs
// Tweet entity class, UserService class, and the tweet DTOs — no
// per-spec `jest.mock()` calls are needed for those.

interface TweetServiceMock {
  getAllTweet: jest.Mock;
  createTweet: jest.Mock;
  updateTweet: jest.Mock;
  DeleteTweet: jest.Mock;
}

describe('DataResponseInterceptor (e2e, TweetController slice, issue #426 regression lock)', () => {
  let app: INestApplication;
  let tweetService: TweetServiceMock;

  beforeEach(async () => {
    tweetService = {
      getAllTweet: jest.fn(async (userId: number) =>
        userId === 404
          ? null // pre-#488 this branch was never reachable due to the NotFoundException throw
          : [
              { id: 1, userId, text: 'Hello' },
              { id: 2, userId, text: 'World' },
            ],
      ),
      createTweet: jest.fn(async (dto: Record<string, unknown>) => ({
        id: 100,
        userId: dto.userId,
        text: dto.text,
      })),
      updateTweet: jest.fn(async (dto: Record<string, unknown>) => ({
        id: dto.id,
        text: dto.text ?? 'Untouched',
      })),
      DeleteTweet: jest.fn(async (id: number) => ({ deleted: true, id })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TweetController],
      providers: [
        { provide: TweetService, useValue: tweetService },
        { provide: APP_INTERCEPTOR, useClass: DataResponseInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('single-object responses (the regression bug)', () => {
    it('POST /tweets/create-tweet -> { apiversion, result: 1, data: <tweet> }', async () => {
      const dto = { userId: 1, text: 'A new tweet' };
      const response = await request(app.getHttpServer())
        .post('/tweets/create-tweet')
        .send(dto);

      expect(response.status).toBe(201);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { id: 100, userId: 1, text: 'A new tweet' },
      });
      expect(tweetService.createTweet).toHaveBeenCalledWith(dto);
    });

    it('PATCH /tweets/update-tweet -> { apiversion, result: 1, data: <tweet> }', async () => {
      const dto = { id: 7, text: 'Edited tweet' };
      const response = await request(app.getHttpServer())
        .patch('/tweets/update-tweet')
        .send(dto);

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { id: 7, text: 'Edited tweet' },
      });
      expect(tweetService.updateTweet).toHaveBeenCalledWith(dto);
    });

    it('DELETE /tweets/:id -> { apiversion, result: 1, data: {deleted: true, id} }', async () => {
      const response = await request(app.getHttpServer()).delete('/tweets/42');

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { deleted: true, id: 42 },
      });
      expect(tweetService.DeleteTweet).toHaveBeenCalledWith(42);
    });
  });

  describe('array responses', () => {
    it('GET /tweets/:userId -> { apiversion, result: N, data: [...] }', async () => {
      const response = await request(app.getHttpServer()).get('/tweets/1');

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, { result: 2 });
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({
        id: 1,
        userId: 1,
        text: 'Hello',
      });
      expect(tweetService.getAllTweet).toHaveBeenCalledWith(1);
    });

    it('GET /tweets/:userId (empty result) -> { apiversion, result: 0, data: [] }', async () => {
      // Override the BeforeEach default (which returns two items for
      // userId=1) so we exercise the array-with-no-items branch of the
      // interceptor.
      tweetService.getAllTweet.mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer()).get('/tweets/1');

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, { result: 0, data: [] });
      expect(tweetService.getAllTweet).toHaveBeenCalledWith(1);
    });
  });

  describe('null responses', () => {
    it('GET /tweets/:userId (null payload) -> { apiversion, result: 0, data: null }', async () => {
      // Mock returns null for userId 404 (the service throws before
      // returning null in production, but the interceptor’s branching
      // contract requires that a null payload surface as
      // `{ result: 0, data: null }`). Override per-test so we hit the
      // null-returning branch without exercising the throw path.
      tweetService.getAllTweet.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer()).get('/tweets/13');

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, { result: 0, data: null });
    });
  });

  describe('exception path isolation', () => {
    it('NotFoundException bypasses the interceptor (no `data` key in body)', async () => {
      // TweetService throws NotFoundException when the user is missing.
      // The exception filter converts it BEFORE the interceptor runs,
      // so the wire shape is the Nest 404 payload — NOT the envelope.
      tweetService.getAllTweet.mockRejectedValueOnce(
        new NotFoundException('User with 999 not found'),
      );

      const response = await request(app.getHttpServer()).get('/tweets/999');

      expect(response.status).toBe(404);
      expectNoEnvelopeKeys(response.body);
      // Sanity-check: the exception filter's signature keys are present.
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('envelope structural invariants', () => {
    it('always sets apiversion to API_VERSION and never emits the legacy typo', async () => {
      const response = await request(app.getHttpServer()).delete('/tweets/1');

      expect(response.status).toBe(200);
      expect(response.body.apiversion).toBe(API_VERSION);
      expect(
        (response.body as Record<string, unknown>).apiversrion,
      ).toBeUndefined();
    });
  });
});
