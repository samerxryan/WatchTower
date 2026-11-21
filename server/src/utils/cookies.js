import { env } from '../config/env.js';

export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.jwt.cookieSecure,
    sameSite: env.cookies.sameSite,
    path: '/api/v1',
  };
}

export function setAccessCookie(res, token, maxAgeMs = ACCESS_COOKIE_MAX_AGE_MS) {
  res.cookie(env.cookies.accessName, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeMs,
  });
}

export function setRefreshCookie(res, token) {
  res.cookie(env.cookies.refreshName, token, {
    ...baseCookieOptions(),
    maxAge: env.jwt.refreshDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res) {
  const options = baseCookieOptions();
  res.clearCookie(env.cookies.accessName, options);
  res.clearCookie(env.cookies.refreshName, options);
}

export function readAccessToken(req) {
  return req.cookies?.[env.cookies.accessName] || null;
}

export function readRefreshToken(req) {
  return req.cookies?.[env.cookies.refreshName] || null;
}
