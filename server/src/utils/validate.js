import { Errors } from './errors.js';

function formatIssue(issue) {
  return {
    field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? ''),
    message: issue.message,
  };
}

/**
 * Validate params, query and body with Zod schemas.
 * Parsed values are exposed through `req.valid` so Express 5 getters for
 * `req.query` are never overwritten.
 */
export function validate(schemas) {
  return function validationMiddleware(req, _res, next) {
    const parsed = {};
    const details = [];

    for (const key of ['params', 'query', 'body']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        details.push(...result.error.issues.map(formatIssue));
      } else {
        parsed[key] = result.data;
      }
    }

    req.valid = { ...(req.valid || {}), ...parsed };

    if (details.length > 0) {
      return next(Errors.validation('Les données fournies sont invalides.', details));
    }

    return next();
  };
}
