import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private static readonly IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
  private static readonly CACHE_TTL = 3600; // 1 hour

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only apply to POST requests
    if (request.method !== 'POST') {
      return next.handle();
    }

    const idempotencyKey = request.headers[IdempotencyInterceptor.IDEMPOTENCY_KEY_HEADER];

    if (!idempotencyKey) {
      return next.handle();
    }

    // Check if we already have a cached response for this key
    const cachedResponse = await this.cacheManager.get(idempotencyKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Proceed with the request and cache the response
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(idempotencyKey, response, IdempotencyInterceptor.CACHE_TTL);
      }),
    );
  }
}
