const API_BASE = '/api/v1';

/** Fired when the refresh session is gone and the UI must clear auth state. */
export const AUTH_EXPIRED_EVENT = 'watchtower:auth-expired';

// A single in-flight refresh is shared by every request that receives a 401,
// so a burst of parallel calls cannot trigger a storm of refresh requests.
let refreshInFlight = null;

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function needsRefresh(path) {
  // Auth endpoints must never be retried through the refresh flow (login
  // failures and the refresh call itself would otherwise recurse). /auth/me is
  // the exception: a live refresh session should silently renew its access.
  return !(path.startsWith('/auth/') && path !== '/auth/me');
}

async function send(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  return fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function readPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return response.json();
}

async function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = send('/auth/refresh', { method: 'POST' })
      .then(async (response) => ({ ok: response.ok, payload: await readPayload(response) }))
      .catch(() => ({ ok: false, payload: null }))
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function notifyAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

export async function apiRequest(path, options = {}) {
  let response = await send(path, options);
  let payload = await readPayload(response);

  // Access tokens live 15 minutes. Renew once from the HttpOnly refresh cookie
  // and replay the original request so the user is not logged out mid-session.
  if (response.status === 401 && needsRefresh(path)) {
    const refreshed = await tryRefresh();
    if (refreshed.ok) {
      response = await send(path, options);
      payload = await readPayload(response);
    } else {
      notifyAuthExpired();
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code || 'HTTP_ERROR',
      payload?.error?.message || `Request failed (${response.status})`,
      payload?.error?.details || [],
    );
  }

  return payload;
}
