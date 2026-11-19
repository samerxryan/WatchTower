export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  validation: (message = 'Les données fournies sont invalides.', details = []) =>
    new AppError(400, 'VALIDATION_ERROR', message, details),
  unauthorized: (message = 'Authentification requise.') =>
    new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Permissions insuffisantes pour cette action.') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Ressource introuvable ou inaccessible.') =>
    new AppError(404, 'NOT_FOUND', message),
  conflict: (message = 'Conflit avec une ressource existante.') =>
    new AppError(409, 'CONFLICT', message),
  unprocessable: (message = 'Validation métier échouée.', details = []) =>
    new AppError(422, 'UNPROCESSABLE_ENTITY', message, details),
  serviceUnavailable: (message = 'Service temporairement indisponible.') =>
    new AppError(503, 'SERVICE_UNAVAILABLE', message),
};
