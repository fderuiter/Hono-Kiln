import { z } from '@hono/zod-openapi'

/** Standard error response schema */
export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: 'The error message',
      example: 'Something went wrong',
    }),
  })
  .openapi('ErrorResponse')

/** Schema representing a single Zod validation issue */
export const ZodIssueSchema = z.object({
  code: z.string().openapi({ description: 'The validation error code', example: 'invalid_type' }),
  expected: z.string().optional().openapi({ description: 'The expected type', example: 'string' }),
  received: z.string().optional().openapi({ description: 'The received type', example: 'undefined' }),
  path: z.array(z.union([z.string(), z.number()])).openapi({ description: 'The path to the invalid field', example: ['body', 'email'] }),
  message: z.string().openapi({ description: 'The validation error message', example: 'Required' }),
}).openapi('ValidationErrorIssue')

/** Detailed schema for validation errors */
export const ValidationErrorDetailSchema = z.object({
  issues: z.array(ZodIssueSchema).openapi({ description: 'The validation issues' }),
  name: z.string().openapi({ description: 'The error name', example: 'ZodError' }),
}).openapi('ValidationErrorDetail')

/** Schema for 422 Unprocessable Entity responses */
export const UnprocessableEntitySchema = z
  .object({
    success: z.literal(false).openapi({
      description: 'Whether the request was successful',
      example: false,
    }),
    error: ValidationErrorDetailSchema.openapi({ description: 'The error details' }),
  })
  .openapi('UnprocessableEntity')

/** Schema for 500 Internal Server Error responses */
export const InternalServerErrorSchema = z
  .object({
    error: z.string().openapi({
      description: 'Internal server error message',
      example: 'Internal server error',
    }),
  })
  .openapi('InternalServerError')

/** Schema for 401 Unauthorized responses */
export const UnauthorizedSchema = z
  .object({
    error: z.string().openapi({
      description: 'Unauthorized error message',
      example: 'Unauthorized',
    }),
  })
  .openapi('Unauthorized')

/** Schema for 404 Not Found responses */
export const NotFoundSchema = z
  .object({
    error: z.string().openapi({
      description: 'Not found error message',
      example: 'Not found',
    }),
  })
  .openapi('NotFound')

/** Schema for 400 Bad Request responses */
export const BadRequestSchema = z
  .object({
    error: z.string().openapi({
      description: 'Bad request error message',
      example: 'Bad request',
    }),
  })
  .openapi('BadRequest')

/** Schema for 503 Service Unavailable responses */
export const ServiceUnavailableSchema = z
  .object({
    status: z.string().openapi({
      description: 'Service status',
      example: 'error',
    }),
  })
  .openapi('ServiceUnavailable')

/** Enumeration of standard HTTP status codes used in the application */
export const HttpStatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const
export * from './auth'
