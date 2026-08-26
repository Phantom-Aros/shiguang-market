import { fail } from '../utils/response.js';

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query'} [source='body']
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const input = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(input);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join('; ');
      return fail(res, message, 'VALIDATION_ERROR', 400);
    }

    if (source === 'query') {
      // Express 5 中 req.query 为只读，校验结果挂到 validatedQuery
      req.validatedQuery = result.data;
    } else {
      req.body = result.data;
    }

    next();
  };
}
