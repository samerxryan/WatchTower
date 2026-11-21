const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;
  const page = toPositiveInteger(query.page, 1);
  const requestedLimit = toPositiveInteger(query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function paginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

export function buildMeta(total, { page, limit }) {
  return paginationMeta(total, page, limit);
}
