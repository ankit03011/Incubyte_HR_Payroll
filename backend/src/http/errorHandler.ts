import type { ApiError, ApiErrorCode } from '@hr/shared';
import type { ErrorRequestHandler } from 'express';
import { DuplicateEmailError, NotFoundError, ValidationError } from '../errors';

function isMalformedJson(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}

function toApiError(error: unknown): { status: number; body: ApiError } {
  const respond = (
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string[]>,
  ) => ({
    status,
    body: { error: fields ? { code, message, fields } : { code, message } },
  });

  if (error instanceof ValidationError) {
    return respond(400, 'VALIDATION_FAILED', error.message, error.fields);
  }
  if (isMalformedJson(error)) return respond(400, 'VALIDATION_FAILED', 'Malformed JSON body');
  if (error instanceof NotFoundError) return respond(404, 'NOT_FOUND', error.message);
  if (error instanceof DuplicateEmailError) {
    return respond(409, 'DUPLICATE_EMAIL', error.message, { email: [error.message] });
  }
  return respond(500, 'INTERNAL_ERROR', 'Something went wrong');
}

/** Maps domain errors to HTTP responses; unexpected errors are logged and hidden from clients. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, body } = toApiError(error);
  if (status === 500) console.error(error);
  res.status(status).json(body);
};
