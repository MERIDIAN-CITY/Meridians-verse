/**
 * E2E regression lock for issue #426 (fixed in #488), PostController slice.
 *
 * Compiles a real Nest testing app with:
 *   - the actual `DataResponseInterceptor` registered as APP_INTERCEPTOR
 *   - the actual `PostController`
 *   - a mocked `PostsService` whose return values are deterministic
 * and asserts that every route shape is wrapped in the
 * `{ apiversion, result, data }` envelope and that a 500 from a
 * TypeError in the interceptor never escapes.
 *
 * If a future refactor re-introduces raw `data.length` access (or any
 * other shape-breaking transformation), this spec will fail loudly at
 * the HTTP layer on the post routes.
 *
 * Run with `npm run test:e2e`.
 */

import { HttpException, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import {
  API_VERSION,
  expectEnvelopeShape,
  expectNoEnvelopeKeys,
} from './helpers/envelope-assert.helper';
import { DataResponseInterceptor } from '../src/common/interceptors/data-response.interceptor';
import { PostController } from '../src/post/post.controller';
import { PostsService } from '../src/post/provider/post.service';

// jest.setup.ts (wired in via jest-e2e.json `setupFiles`) already stubs
// Post entity chain, PostsService class, TagsService class,
// pagination provider, UserService, and the post DTOs — no per-spec
// `jest.mock()` calls are needed for those.

interface PostsServiceMock {
  FindAllposts: jest.Mock;
  createPost: jest.Mock;
  deleteOne: jest.Mock;
  restorePost: jest.Mock;
  UpdatePost: jest.Mock;
}

describe('DataResponseInterceptor (e2e, PostController slice, issue #426 regression lock)', () => {
  let app: INestApplication;
  let postService: PostsServiceMock;

  beforeEach(async () => {
    postService = {
      FindAllposts: jest.fn(async () => ({
        data: [
          { id: 1, title: 'Hello' },
          { id: 2, title: 'World' },
        ],
        meta: {
          itemsPerPage: 10,
          totalItems: 2,
          currentPage: 1,
          totalPages: 1,
        },
      })),
      createPost: jest.fn(async (dto: Record<string, unknown>) => ({
        id: 99,
        title: dto.title,
        slug: 'post-99',
      })),
      deleteOne: jest.fn(async (id: number) => ({ deleted: true, id })),
      restorePost: jest.fn(async (id: number) => ({ restored: true, id })),
      UpdatePost: jest.fn(async (dto: Record<string, unknown>) => ({
        id: dto.id,
        title: 'Updated',
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        { provide: PostsService, useValue: postService },
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
    it('POST /posts -> { apiversion, result: 1, data: <post> }', async () => {
      const dto = {
        title: 'New Post',
        authorId: 1,
        postType: 'post',
        PostStatus: 'draft',
        tags: [1, 2],
      };
      const response = await request(app.getHttpServer())
        .post('/posts')
        .send(dto);

      expect(response.status).toBe(201);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { id: 99, title: 'New Post' },
      });
      expect(postService.createPost).toHaveBeenCalled();
    });

    it('PATCH /posts -> { apiversion, result: 1, data: <updated-post> }', async () => {
      const dto = { id: 1, title: 'Updated Title' };
      const response = await request(app.getHttpServer())
        .patch('/posts')
        .send(dto);

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { id: 1, title: 'Updated' },
      });
      expect(postService.UpdatePost).toHaveBeenCalledWith(dto);
    });

    it('POST /posts/:id/restore -> { apiversion, result: 1, data: {restored: true, id} }', async () => {
      const response = await request(app.getHttpServer()).post(
        '/posts/1/restore',
      );

      expect(response.status).toBe(201);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { restored: true, id: 1 },
      });
      expect(postService.restorePost).toHaveBeenCalledWith(1);
    });

    it('DELETE /posts?id=N -> { apiversion, result: 1, data: {deleted: true, id} }', async () => {
      // Source uses @Query('id', ParseIntPipe) for deleteOne.
      const response = await request(app.getHttpServer()).delete('/posts?id=7');

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { deleted: true, id: 7 },
      });
      expect(postService.deleteOne).toHaveBeenCalledWith(7);
    });
  });

  describe('paginated-object responses (single-object envelope, NOT array)', () => {
    // GetPostsDto returns Paginated<Post> = { data: Post[], meta: {...} }.
    // The interceptor must treat the outer shape as a single object and
    // wrap it as result: 1, data: <paginated>. A bug where the
    // interceptor recursed into `.data` would surface as
    // result: <array.length>, data: <paginated>. Lock against the
    // correct behavior here.
    it('GET /posts -> { apiversion, result: 1, data: <paginated> }', async () => {
      const response = await request(app.getHttpServer()).get('/posts');

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: {
          meta: {
            itemsPerPage: 10,
            totalItems: 2,
            currentPage: 1,
            totalPages: 1,
          },
        },
      });
      // Inner array must remain inside `data.data` (i.e. the interceptor
      // did NOT flatten it).
      const inner = (response.body.data as { data: unknown[] }).data;
      expect(Array.isArray(inner)).toBe(true);
      expect(inner).toHaveLength(2);
    });
  });

  describe('exception path isolation', () => {
    it('POST /posts/404/restore -> 404 with no envelope keys on the body', async () => {
      // Restore throws HttpException(404) when nothing is restorable.
      // Nest's exception filter converts it BEFORE the interceptor sees
      // it, so the wire shape is the exception JSON — NOT the envelope.
      // Lock against two regression modes: (a) status code, (b) no
      // envelope keys leaking into the error body.
      postService.restorePost.mockRejectedValueOnce(
        new HttpException(
          {
            status: 404,
            error: 'Post with id 404 was not found or is not soft-deleted',
          },
          404,
        ),
      );

      const response = await request(app.getHttpServer()).post(
        '/posts/404/restore',
      );

      expect(response.status).toBe(404);
      expectNoEnvelopeKeys(response.body);
    });
  });

  describe('envelope structural invariants', () => {
    it('always sets apiversion to API_VERSION and never emits the legacy typo', async () => {
      const response = await request(app.getHttpServer()).delete('/posts?id=1');

      expect(response.status).toBe(200);
      expect(response.body.apiversion).toBe(API_VERSION);
      expect(
        (response.body as Record<string, unknown>).apiversrion,
      ).toBeUndefined();
    });
  });
});
