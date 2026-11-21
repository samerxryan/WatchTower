import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle malformed JSON request bodies cleanly
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Corps de requête JSON invalide.',
        details: [],
      },
    });
  }

  // Handle MySQL connection errors without leaking credentials or SQL internals
  if (err?.code === 'ECONNREFUSED' || err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'La base de données MySQL est actuellement inaccessible.',
        details: [],
      },
    });
  }

  if (!env.isTest) {
    console.error(`[WatchTower API Error] ${req.method} ${req.path}:`, err?.message || 'Unknown error');
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue.',
      details: [],
    },
  });
}
