import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Current API version embedded in every response envelope.
 *
 * Exported so consumers (other interceptors, integration tests,
 * OpenAPI generators) reference a single source of truth instead of
 * hard-coding the literal in scattered call-sites.
 */
export const API_VERSION = '0.0.1';

/**
 * Shape of the response envelope applied to every controller payload.
 *
 * Kept as a dedicated TypeScript interface so the contract is verifiable
 * from tests, drives the IDE, and matches the Swagger model declared in
 * {@link EnvelopeDto}.
 *
 * @see EnvelopeDto
 * @see ApiEnvelopeResponse
 */
export interface DataResponseEnvelope<T> {
  apiversion: string;
  result: number;
  data: T;
}

/**
 * Global NestJS interceptor that wraps every controller response in the
 * standard {@link DataResponseEnvelope} so clients can rely on a single
 * wire-shape contract across the entire API.
 *
 * Registered in two places to match the same envelope both locally and
 * across the test harness:
 *   - `main.ts`      – `app.useGlobalInterceptors(new DataResponseInterceptor())`
 *   - `AppModule`    – `APP_INTERCEPTOR` provider
 *
 * This fixes the broken behaviour called out in issue #426 (single-object,
 * primitive and `null` payloads used to crash the interceptor because it
 * called `data.length` unconditionally).
 *
 * @see EnvelopeDto
 * @see ApiEnvelopeResponse
 */
@Injectable()
export class DataResponseInterceptor<T = unknown> implements NestInterceptor<
  T,
  DataResponseEnvelope<T>
> {
  /**
   * RxJS entry point invoked by Nest for every controller completion.
   *
   * @param _context Nest execution context (unused; the interceptor is
   *   content-agnostic and only transforms the resolved payload).
   * @param next Downstream handler whose resolved value becomes `data`.
   * @returns A stream that emits the controller payload wrapped in a
   *   {@link DataResponseEnvelope}.
   * @throws {never} This method never throws. Handler errors propagate
   *   upstream through `next.handle()` and are converted by Nest's
   *   global exception filter before reaching the interceptor.
   * @see transform
   */
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<DataResponseEnvelope<T>> {
    return next.handle().pipe(map((data: T) => this.transform(data)));
  }

  /**
   * Pure transformation from a controller payload to the standard envelope.
   *
   * Kept as an instance method (rather than inlined into `intercept`) so
   * unit tests can exercise the contract without standing up the rest of
   * the Nest harness.
   *
   * @param data The controller return value (array, object, primitive,
   *   `null`, or `undefined`).
   * @returns A {@link DataResponseEnvelope} where `result` reflects `data`:
   *
   *   - `Array.isArray(data)`         -> `result = data.length`
   *   - Single objects / primitives   -> `result = 1`
   *   - `null` / `undefined`          -> `result = 0, data: null`
   *
   *   Plain objects that happen to expose a numeric `length` field are
   *   intentionally NOT treated as arrays — only real JavaScript arrays
   *   trigger the array branch.
   * @throws {never} This method never throws. It only constructs objects.
   *
   * @example Array payload
   *   transform([{ id: 1 }, { id: 2 }])
   *   // => { apiversion: '0.0.1', result: 2, data: [{ id: 1 }, { id: 2 }] }
   *
   * @example Single-object payload
   *   transform({ id: 1, email: 'a@b.com' })
   *   // => { apiversion: '0.0.1', result: 1, data: { id: 1, email: 'a@b.com' } }
   *
   * @example Primitive payload
   *   transform('Hello World!')
   *   // => { apiversion: '0.0.1', result: 1, data: 'Hello World!' }
   *
   * @example Null payload
   *   transform(null)
   *   // => { apiversion: '0.0.1', result: 0, data: null }
   *
   * @see DataResponseInterceptor
   * @see DataResponseEnvelope
   */
  transform(data: T): DataResponseEnvelope<T> {
    if (data === null || data === undefined) {
      return { apiversion: API_VERSION, result: 0, data: null as T };
    }

    if (Array.isArray(data)) {
      return { apiversion: API_VERSION, result: data.length, data };
    }

    return { apiversion: API_VERSION, result: 1, data };
  }
}
