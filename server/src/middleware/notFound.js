import { Errors } from '../utils/errors.js';

export function apiNotFoundHandler(req, res, next) {
  // Keep the path out of the response: reflected URLs can contain tokens or
  // other sensitive query parameters.
  next(Errors.notFound('Endpoint introuvable.'));
}
