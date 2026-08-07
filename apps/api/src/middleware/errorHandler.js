import { fail } from '../utils/response.js';
import { logger } from '../logger.js';

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {number} [status]
   */
  constructor(message, code = 'INTERNAL_ERROR', status = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

/**
 * @param {import('express').Request} req
 */
function getRequestLogger(req) {
  return req.log ?? logger;
}

/** @type {import('express').ErrorRequestHandler} */
export function errorHandler(err, req, res, _next) {
  const log = getRequestLogger(req);

  if (err instanceof AppError) {
    if (err.status >= 500) {
      log.warn({ err, code: err.code, status: err.status }, err.message);
    }
    return fail(res, err.message, err.code, err.status);
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    log.warn({ err }, 'upload file size exceeded');
    return fail(res, '图片大小不能超过 5MB', 'VALIDATION_ERROR', 400);
  }

  log.error({ err }, 'unhandled error');
  return fail(res, 'Internal server error', 'INTERNAL_ERROR', 500);
}
