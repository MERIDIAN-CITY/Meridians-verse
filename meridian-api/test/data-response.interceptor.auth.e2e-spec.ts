/**
 * E2E regression lock for issue #426 (fixed in #488), AuthController slice.
 *
 * Compiles a real Nest testing app with:
 *   - the actual `DataResponseInterceptor` registered as APP_INTERCEPTOR
 *   - the actual `AuthController`
 *   - a mocked `AuthService` whose return values are deterministic
 * and asserts that every route shape (single object only — auth never
 * returns arrays) is wrapped in the `{ apiversion, result, data }`
 * envelope and the response is never a 500 due to a TypeError in the
 * interceptor.
 *
 * Special plumbing notes:
 *
 *   - `AccessTokenGuard` is referenced via
 *     `@UseGuards(AccessTokenGuard)` on the `logoutAll` route. We mock
 *     the guard to `canActivate() => true` so its JWT verification
 *     chain doesn't need to boot inside the e2e test app.
 *   - `@Throttle()` decorators from `@nestjs/throttler` are inert in
 *     our isolated test app because `ThrottlerGuard` (registered via
 *     `APP_GUARD` in AppModule) is NOT installed here. They're
 *     metadata-only at decoration time.
 *
 * If a future refactor re-introduces raw `data.length` access (or any
 * other shape-breaking transformation), this spec fails loudly at the
 * HTTP layer on the auth routes.
 *
 * Run with `npm run test:e2e`.
 */

import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import {
  API_VERSION,
  expectEnvelopeShape,
  expectNoEnvelopeKeys,
} from './helpers/envelope-assert.helper';
import { DataResponseInterceptor } from '../src/common/interceptors/data-response.interceptor';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/providers/auth.service';

// Mock AccessTokenGuard so the @UseGuards() decorator on `logoutAll`
// doesn't pull JwtService + jwt.config into the test app. The mock
// faithfully reproduces the real guard's contract: it stamps a
// verified JWT payload onto req[REQUEST_USER_KEY] so the controller's
// `req[REQUEST_USER_KEY].sub` lookup succeeds and the handler
// reaches `authService.logoutAll(sub)`.
jest.mock(
  'src/auth/guard/access-token/access-token.guard',
  () => ({
    AccessTokenGuard: class AccessTokenGuard {
      canActivate(context: {
        switchToHttp: () => { getRequest: () => Record<string, unknown> };
      }): boolean {
        const req = context.switchToHttp().getRequest();
        req['user'] = { sub: 42 };
        return true;
      }
    },
  }),
  { virtual: true },
);

// jest.setup.ts (wired in via jest-e2e.json `setupFiles`) already stubs
// AuthService class, UserService class, all auth provider modules
// (sign-in.providers, refreshToken.provider, verify-email.provider,
// hashing, token.provider), the User entity, and most auth DTOs — no
// per-spec `jest.mock()` calls are needed for those.

interface AuthServiceMock {
  SignIn: jest.Mock;
  RefreshToken: jest.Mock;
  logout: jest.Mock;
  logoutAll: jest.Mock;
  verifyEmail: jest.Mock;
  resendVerification: jest.Mock;
}

describe('DataResponseInterceptor (e2e, AuthController slice, issue #426 regression lock)', () => {
  let app: INestApplication;
  let authService: AuthServiceMock;

  beforeEach(async () => {
    authService = {
      SignIn: jest.fn(async () => ({
        accessToken: 'jwt.access.mock',
        refreshToken: 'jwt.refresh.mock',
      })),
      RefreshToken: jest.fn(async () => ({
        accessToken: 'jwt.access.refreshed',
      })),
      logout: jest.fn(async () => ({ revoked: true })),
      logoutAll: jest.fn(async () => ({ revokedAll: true, count: 3 })),
      verifyEmail: jest.fn(async (token: string) => ({
        email: `user-${token}@example.com`,
      })),
      resendVerification: jest.fn(async () => ({
        status: 'ok',
        message:
          'If that email belongs to an unverified account, a new verification email has been sent.',
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
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
    it('POST /auth/sign-in -> { apiversion, result: 1, data: <tokens> }', async () => {
      const dto = { email: 'jane@example.com', password: 'Password123!' };
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send(dto);

      // @HttpCode(HttpStatus.OK) overrides Nest's default 201 for POST.
      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: {
          accessToken: 'jwt.access.mock',
          refreshToken: 'jwt.refresh.mock',
        },
      });
      expect(authService.SignIn).toHaveBeenCalledWith(dto);
    });

    it('POST /auth/refresh-token -> { apiversion, result: 1, data: <token> }', async () => {
      const dto = { refreshToken: 'jwt.refresh.mock' };
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send(dto);

      // @HttpCode(HttpStatus.OK) overrides Nest's default 201 for POST.
      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { accessToken: 'jwt.access.refreshed' },
      });
      expect(authService.RefreshToken).toHaveBeenCalled();
    });

    it('POST /auth/logout -> { apiversion, result: 1, data: {revoked: true} }', async () => {
      const dto = { refreshToken: 'jwt.refresh.mock' };
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send(dto);

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { revoked: true },
      });
    });

    it('POST /auth/logout-all (guarded) -> { apiversion, result: 1, data: <summary> }', async () => {
      // The mocked AccessTokenGuard stamps req[REQUEST_USER_KEY] with
      // { sub: 42 } so the handler reaches authService.logoutAll(42)
      // and the success envelope is what we lock.
      const response = await request(app.getHttpServer()).post(
        '/auth/logout-all',
      );

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: { revokedAll: true, count: 3 },
      });
      expect(authService.logoutAll).toHaveBeenCalledWith(42);
    });

    it('POST /auth/verify-email -> { apiversion, result: 1, data: {verified:true, email} }', async () => {
      const dto = { token: 'tok-abc' };
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send(dto);

      expect(response.status).toBe(200);
      // The controller returns { verified: true, email: user.email }
      // directly, not via authService.verifyEmail. So we assert the
      // shape produced by the controller's wrapping.
      const body = response.body as {
        apiversion: string;
        result: number;
        data: { verified: boolean; email: string };
      };
      expect(body.apiversion).toBe(API_VERSION);
      expect(body.result).toBe(1);
      expect(body.data.verified).toBe(true);
      expect(typeof body.data.email).toBe('string');
    });

    it('POST /auth/resend-verification -> { apiversion, result: 1, data: {status, message} }', async () => {
      const dto = { email: 'jane@example.com' };
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send(dto);

      expect(response.status).toBe(200);
      expectEnvelopeShape(response.body, {
        result: 1,
        data: {
          status: 'ok',
          message:
            'If that email belongs to an unverified account, a new verification email has been sent.',
        },
      });
      expect(authService.resendVerification).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('exception path isolation', () => {
    it('POST /auth/sign-in error -> AuthService rejection bypasses the envelope', async () => {
      // Force the auth service to reject with an Error. Nest's
      // BaseExceptionFilter returns 500; assert the body has no
      // envelope keys.
      authService.SignIn.mockRejectedValueOnce(
        new Error('forced sign-in error'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'x@y', password: 'p' });

      expect(response.status).toBe(500);
      expect(authService.SignIn).toHaveBeenCalled();
      expectNoEnvelopeKeys(response.body);
    });
  });

  describe('envelope structural invariants', () => {
    it('always sets apiversion to API_VERSION and never emits the legacy typo', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'jwt.refresh.mock' });

      expect(response.status).toBe(200);
      expect(response.body.apiversion).toBe(API_VERSION);
      expect(
        (response.body as Record<string, unknown>).apiversrion,
      ).toBeUndefined();
    });
  });
});
