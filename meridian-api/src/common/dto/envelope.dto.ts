import { ApiProperty } from '@nestjs/swagger';
import { API_VERSION } from '../interceptors/data-response.interceptor';

/**
 * Shape of the response envelope that the global
 * {@link DataResponseInterceptor} applies to every controller payload.
 *
 * NestJS Swagger can't represent the open-generic `data: T` directly, so
 * we model `data` as a free-form / nullable object and rely on the
 * companion decorator `@ApiEnvelopeResponse` (which composes examples or
 * `$ref`s) to narrow per-endpoint. Consumers reading the OpenAPI spec at
 * `/api` should rely on the `result` field to disambiguate shape.
 *
 * @see DataResponseInterceptor
 * @see ApiEnvelopeResponse
 */
export class EnvelopeDto<TData = unknown> {
  @ApiProperty({
    example: API_VERSION,
    description: 'API version of the response envelope (semver).',
  })
  apiversion!: string;

  @ApiProperty({
    example: 1,
    minimum: 0,
    description:
      'Count of records carried by `data`. Equals `data.length` for arrays, ' +
      '`1` for a single object or primitive, and `0` when `data` is `null`.',
  })
  result!: number;

  @ApiProperty({
    description:
      'The unwrapped controller payload. May be a JSON array, single object, ' +
      'primitive, or `null`. Shape and element type depend on the endpoint — ' +
      'use the per-endpoint example / `$ref` emitted by @ApiEnvelopeResponse ' +
      'for the concrete shape.',
    oneOf: [
      { type: 'object', additionalProperties: true },
      { type: 'array', items: { type: 'object', additionalProperties: true } },
      { type: 'string' },
      { type: 'number' },
      { type: 'integer' },
      { type: 'boolean' },
      { type: 'null' },
    ],
    nullable: true,
  })
  data!: TData;
}
