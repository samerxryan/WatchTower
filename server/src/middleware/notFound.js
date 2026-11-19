import { Errors } from '../utils/errors.js';

export function apiNotFoundHandler(req, res, next) {
  next(Errors.notFound(`Endpoint introuvable : ${req.method} ${req.originalUrl}`));
}
