import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let cacheManager: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should pass through non-POST requests', async () => {
    const context = createMockContext('GET');
    const next: CallHandler = { handle: jest.fn(() => of('test')) };

    const result = await interceptor.intercept(context, next);
    result.subscribe();

    expect(next.handle).toHaveBeenCalled();
    expect(cacheManager.get).not.toHaveBeenCalled();
  });

  it('should pass through POST requests without idempotency key', async () => {
    const context = createMockContext('POST');
    const next: CallHandler = { handle: jest.fn(() => of('test')) };

    const result = await interceptor.intercept(context, next);
    result.subscribe();

    expect(next.handle).toHaveBeenCalled();
    expect(cacheManager.get).not.toHaveBeenCalled();
  });

  it('should return cached response for POST requests with existing idempotency key', async () => {
    const idempotencyKey = 'test-key-123';
    const cachedResponse = 'cached response';
    cacheManager.get.mockResolvedValue(cachedResponse);

    const context = createMockContext('POST', idempotencyKey);
    const next: CallHandler = { handle: jest.fn(() => of('new response')) };

    const result = await interceptor.intercept(context, next);
    let actualResult;
    result.subscribe((val) => {
      actualResult = val;
    });

    expect(actualResult).toBe(cachedResponse);
    expect(cacheManager.get).toHaveBeenCalledWith(idempotencyKey);
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('should cache the response for POST requests with new idempotency key', async () => {
    const idempotencyKey = 'test-key-456';
    const newResponse = 'new response';
    cacheManager.get.mockResolvedValue(null);

    const context = createMockContext('POST', idempotencyKey);
    const next: CallHandler = { handle: jest.fn(() => of(newResponse)) };

    const result = await interceptor.intercept(context, next);
    let actualResult;
    result.subscribe((val) => {
      actualResult = val;
    });

    expect(actualResult).toBe(newResponse);
    expect(next.handle).toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalledWith(idempotencyKey, newResponse, 3600);
  });

  function createMockContext(method: string, idempotencyKey?: string): ExecutionContext {
    const request = {
      method,
      headers: {},
    };
    if (idempotencyKey) {
      request.headers['idempotency-key'] = idempotencyKey;
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }
});
