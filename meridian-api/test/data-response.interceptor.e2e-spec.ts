/**
 * E2E regression lock for issue #426 (fixed in #488).
 *
 * Before the fix the global `DataResponseInterceptor` called
 * `data.length` on every controller payload, which threw a TypeError
 * for single-object, primitive and `null` responses and surfaced to
 * clients as a 500. This spec compiles a real Nest testing app with
 *   - the actual `DataResponseInterceptor` registered as APP_INTERCEPTOR
 *   - the actual `UsersController`
 *   - a mocked `UserService` whose return values are deterministic
 * and drives every category of payload (single object, array, `null`)
 * through `supertest`, asserting the wire shape is always
 * `{ apiversion, result, data }` and the response is never a 500
 * caused by a TypeError in the interceptor.
 *
 * If a future refactor re-introduces raw `data.length` access (or any
 * other shape-breaking transformation), this spec will fail loudly at
 * the HTTP layer.
 *
 * Run with `npm run test:e2e`.
 */

import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

// ----- Inline mocks for the symbols UsersController / the envelope
//        decorator pull in but jest.setup.ts (wired in via
//        jest-e2e.json `setupFiles`) does not cover. Entity chain,
//        DTOs, auth provider modules and pagination are stubbed by the
//        shared setup file so we don't have to repeat them here.
jest.mock(
  'src/auth/enums/auth-type.enum',
  () => ({
    AuthType: { Bearer: 0, None: 1 },
  }),
  { virtual: true },
);
jest.mock(
  'src/auth/decorators/auth/auth.decorator',
  () => ({
    Auth: () => () => undefined,
  }),
  { virtual: true },
);
jest.mock(
  'src/common/decorators/api-envelope-response.decorator',
  () => ({
    ApiEnvelopeResponse: () => () => undefined,
  }),
  { virtual: true },
);

// The version literal this spec asserts every `apiversion` field
// carries. Post-#488 the interceptor exports API_VERSION with this
// same value; pre-#488 it's hard-coded inside the buggy `apiversrion`
// literal. Either way the wire shape on `main` today is '0.0.1', so
// the spec locks against that constant.
//
// DRIFT WARNING: if a future PR bumps the interceptor's
// API_VERSION export, this literal must be updated in lockstep,
// otherwise the spec silently locks the OLD value. A test failure
// on a same-major version bump is acceptable but a silent drift
// is not.
const API_VERSION = '0.0.1';

import { DataResponseInterceptor } from '../src/common/interceptors/data-response.interceptor';
import { UsersController } from '../src/users/users.controller';
import { UserService } from '../src/users/providers/user.services';

describe('DataResponseInterceptor (e2e, issue #426 regression lock)', () => {
  let app: INestApplication;
  let userService: {
    findAll: jest.Mock;
    findOneById: jest.Mock;
    deleteUser: jest.Mock;
    restoreUser: jest.Mock;
    editUser: jest.Mock;
  };
  beforeEach(async () => {
    userService = {
      findAll: jest.fn(async () => [
        { id: 1, firstName: 'Jane', email: 'jane@example.com' },
        { id: 2, firstName: 'John', email: 'john@example.com' },
      ]),
      findOneById: jest.fn(async (id: number) =>
        id === 1 ? { id, firstName: 'Jane' } : null,
      ),
      deleteUser: jest.fn(async (id: number) => ({ deleted: true, id })),
      restoreUser: jest.fn(async (id: number) => ({ restored: true, id })),
      editUser: jest.fn(async (dto: Record<string, unknown>) => ({
        id: dto.id,
        firstName: 'Updated',
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: APP_INTERCEPTOR, useClass: DataResponseInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Pipe + global error filter is intentionally omitted so the spec
    // focuses entirely on the interceptor contract. Disable body
    // parsing is also not needed – supertest handles payloads fine.
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('single-object responses (the regression bug)', () => {
    it('DELETE /users/:id -> { apiversion, result: 1, data: {deleted, id} }', async () => {
      // Before #426 the buggy interceptor tried
      // `({deleted,id}).length` and threw a TypeError -> 500.
      const response = await request(app.getHttpServer()).delete('/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        apiversion: API_VERSION,
        result: 1,
        data: { deleted: true, id: 1 },
      });
      expect(userService.deleteUser).toHaveBeenCalledWith(1);
    });

    it('POST /users/:id/restore -> { apiversion, result: 1, data: {restored, id} }', async () => {
      const response = await request(app.getHttpServer()).post(
        '/users/1/restore',
      );

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        apiversion: API_VERSION,
        result: 1,
        data: { restored: true, id: 1 },
      });
      expect(userService.restoreUser).toHaveBeenCalledWith(1);
    });

    it('PATCH /users -> { apiversion, result: 1, data: <user> }', async () => {
      const dto = { id: 1, firstName: 'Updated' };
      const response = await request(app.getHttpServer())
        .patch('/users')
        .send(dto);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        apiversion: API_VERSION,
        result: 1,
        data: { id: 1, firstName: 'Updated' },
      });
      expect(userService.editUser).toHaveBeenCalled();
    });

    it('GET /users/find/:id (hit) -> { apiversion, result: 1, data: <user> }', async () => {
      const response = await request(app.getHttpServer()).get('/users/find/1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        apiversion: API_VERSION,
        result: 1,
        data: { id: 1, firstName: 'Jane' },
      });
      expect(userService.findOneById).toHaveBeenCalledWith(1);
    });
  });

  describe('null responses', () => {
    it('GET /users/find/:id (miss) -> { apiversion, result: 0, data: null }', async () => {
      // The source returns `null` when the row is missing; the
      // interceptor MUST surface that as `{ result: 0, data: null }`
      // rather than crashing or stringifying.
      const response = await request(app.getHttpServer()).get(
        '/users/find/404',
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        apiversion: API_VERSION,
        result: 0,
        data: null,
      });
      expect(userService.findOneById).toHaveBeenCalledWith(404);
    });
  });

  describe('array responses', () => {
    it('GET /users -> { apiversion, result: N, data: [...] }', async () => {
      const response = await request(app.getHttpServer()).get('/users');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        apiversion: API_VERSION,
        result: 2,
      });
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({
        id: 1,
        firstName: 'Jane',
        email: 'jane@example.com',
      });
    });
  });

  describe('envelope structural invariants', () => {
    it('always sets apiversion to API_VERSION and never emits the legacy typo', async () => {
      const response = await request(app.getHttpServer()).get('/users/find/1');

      expect(response.status).toBe(200);
      // Regression guard: the original buggy code shipped a typo'd
      // `apiversrion` literal; the fixed interceptor must emit the
      // corrected `apiversion` and never the misspelled one.
      expect(response.body.apiversion).toBe(API_VERSION);
      expect(response.body.apiversrion).toBeUndefined();
    });
  });

  describe('exception path isolation', () => {
    it('exceptions bypass the interceptor entirely (no `data` key in body)', async () => {
      // If a route handler rejects with an HttpException (or any Error),
      // Nest's exception filter converts it BEFORE the interceptor sees
      // it. The wire shape is the exception JSON
      // ({statusCode, message, ...}) — NOT the envelope. Verify both
      // the 500 status AND that the response body has no envelope keys.
      userService.findOneById.mockRejectedValueOnce(new Error('forced'));

      const response = await request(app.getHttpServer()).get('/users/find/1');

      expect(response.status).toBe(500);
      // Spy assertion: prove we hit the service (and therefore the
      // rejected path), not a phantom 500 from somewhere else.
      expect(userService.findOneById).toHaveBeenCalledWith(1);
      // Sharper regression lock: a regression that wraps errors inside
      // the envelope would surface an `apiversion` + `data` key here.
      // A real Nest exception filter response uses `statusCode` /
      // `message` instead, which is what we want.
      expect(response.body).not.toHaveProperty('data');
      expect(response.body).not.toHaveProperty('apiversion');
    });
  });
});
