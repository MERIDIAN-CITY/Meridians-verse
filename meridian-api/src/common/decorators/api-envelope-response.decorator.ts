import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import { API_VERSION } from '../interceptors/data-response.interceptor';
import { EnvelopeDto } from '../dto/envelope.dto';

/**
 * Options accepted by {@link ApiEnvelopeResponse}.
 *
 * - `dataExample` — a literal value to drop into the `data` field of the
 *   generated example so consumers can see the wire format upfront.
 *   The decorator derives `result` from this example's shape using the
 *   same rule the interceptor applies at runtime, so docs and code
 *   cannot drift: array -> `dataExample.length`, `null` -> `0`,
 *   anything else -> `1`.
 * - `status`      — HTTP status code (defaults to `200`).
 * - `description` — free-form description that supersedes the default.
 */
export interface ApiEnvelopeResponseOptions {
  dataExample?: unknown;
  status?: number;
  description?: string;
}

/**
 * Drop-in replacement for `@ApiOkResponse` that documents the standard
 * `{ apiversion, result, data }` envelope applied globally by
 * {@link DataResponseInterceptor}.
 *
 * The decorator:
 *   1. Registers the canonical `EnvelopeDto` as an OpenAPI extra model
 *      so the `$ref` resolves in the spec on first use.
 *   2. Emits `@ApiOkResponse({ schema: { allOf: [{$ref: EnvelopeDto}, ...] } })`.
 *   3. Augments the schema with a concrete `example` so consumers can
 *      see the wire format (including `result`) without inspecting
 *      the source.
 *
 * @example  // Generic envelope, no inline data shape:
 *   @ApiEnvelopeResponse()
 *
 * @example  // Concrete array payload:
 *   @ApiEnvelopeResponse({
 *     dataExample: [{ id: 1, firstName: 'Jane' }],
 *     description: 'List of users wrapped in the standard envelope.',
 *   })
 *
 * @example  // Concrete single-object payload + specific 201 status:
 *   @ApiEnvelopeResponse({
 *     dataExample: { id: 1, email: 'a@b.com' },
 *     status: 201,
 *   })
 */
export function ApiEnvelopeResponse(
  options: ApiEnvelopeResponseOptions = {},
): MethodDecorator {
  const {
    dataExample,
    status = 200,
    description = 'Standard DataResponse envelope: { apiversion, result, data }.',
  } = options;

  // Derive `result` from the example's shape using the same rule the
  // interceptor applies at runtime, so docs and code cannot drift:
  // - Array.isArray(dataExample) -> result = dataExample.length
  // - dataExample === null/undefined -> result = 0
  // - otherwise -> result = 1
  const derivedResult =
    dataExample === null || dataExample === undefined
      ? 0
      : Array.isArray(dataExample)
        ? dataExample.length
        : 1;

  const example = {
    apiversion: API_VERSION,
    result: derivedResult,
    data: dataExample ?? null,
  };

  // Build the schema explicitly so TypeScript picks `ApiResponseOptions`
  // (which carries `status`) instead of `ApiResponseNoStatusOptions`.
  const responseOptions: ApiResponseOptions = {
    status,
    description,
    schema: {
      // Reference the shared envelope schema so consumers see the
      // fixed `apiversion`/`result` shape and the variable `data` field.
      allOf: [{ $ref: getSchemaPath(EnvelopeDto) }],
      example,
    },
  };

  return applyDecorators(
    ApiExtraModels(EnvelopeDto),
    ApiOkResponse(responseOptions),
  );
}
