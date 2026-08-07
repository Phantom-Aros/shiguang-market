import { fail } from '../utils/response.js';

/**
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join('; ');
      return fail(res, message, 'VALIDATION_ERROR', 400);
    }
    req.body = result.data;
    next();
  };
}
