import { apiRequest } from './apiClient.js';

// The API paginates list endpoints at 20 rows by default. Kanban, calendar,
// timeline and dashboards need the full accessible set, so request the maximum
// the server allows.
function withLimit(params = '', limit = 100) {
  if (/(?:^|[?&])limit=/.test(params)) return params;
  const separator = params ? (params.includes('?') ? '&' : '?') : '?';
  return `${params}${separator}limit=${limit}`;
}

export const authApi = {
  me: () => apiRequest('/auth/me'),
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  refresh: () => apiRequest('/auth/refresh', { method: 'POST' }),
  verify: () => apiRequest('/auth/verify'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: payload }),
};

export const usersApi = {
  list: (params = '') => apiRequest(`/users${withLimit(params)}`),
  updateMe: (payload) => apiRequest('/users/me', { method: 'PATCH', body: payload }),
  updatePassword: (payload) =>
    apiRequest('/users/me/password', { method: 'PATCH', body: payload }),
  updatePreferences: (payload) =>
    apiRequest('/users/me/preferences', { method: 'PATCH', body: payload }),
  updateRole: (userId, role) =>
    apiRequest(`/users/${userId}/role`, { method: 'PATCH', body: { role } }),
  updateStatus: (userId, isActive) =>
    apiRequest(`/users/${userId}/status`, { method: 'PATCH', body: { isActive } }),
};

export const projectsApi = {
  list: (params = '') => apiRequest(`/projects${withLimit(params)}`),
  get: (projectId) => apiRequest(`/projects/${projectId}`),
  create: (payload) => apiRequest('/projects', { method: 'POST', body: payload }),
  update: (projectId, payload) =>
    apiRequest(`/projects/${projectId}`, { method: 'PATCH', body: payload }),
  archive: (projectId) => apiRequest(`/projects/${projectId}`, { method: 'DELETE' }),
  addMember: (projectId, payload) =>
    apiRequest(`/projects/${projectId}/members`, { method: 'POST', body: payload }),
  removeMember: (projectId, userId) =>
    apiRequest(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  activity: (projectId) => apiRequest(`/projects/${projectId}/activity`),
};

export const tasksApi = {
  listAll: (params = '') => apiRequest(`/tasks${withLimit(params)}`),
  listByProject: (projectId, params = '') =>
    apiRequest(`/projects/${projectId}/tasks${withLimit(params)}`),
  create: (projectId, payload) =>
    apiRequest(`/projects/${projectId}/tasks`, { method: 'POST', body: payload }),
  update: (taskId, payload) => apiRequest(`/tasks/${taskId}`, { method: 'PATCH', body: payload }),
  updateStatus: (taskId, status) =>
    apiRequest(`/tasks/${taskId}/status`, { method: 'PATCH', body: { status } }),
  remove: (taskId) => apiRequest(`/tasks/${taskId}`, { method: 'DELETE' }),
  listComments: (taskId) => apiRequest(`/tasks/${taskId}/comments`),
  addComment: (taskId, content) =>
    apiRequest(`/tasks/${taskId}/comments`, { method: 'POST', body: { content } }),
  deleteComment: (commentId) => apiRequest(`/comments/${commentId}`, { method: 'DELETE' }),
};

export const NOTIFICATIONS_UPDATED_EVENT = 'notifications:updated';

export function broadcastNotificationsUpdated(unreadCount) {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount },
    }),
  );
}

export const notificationsApi = {
  list: (params = '') => apiRequest(`/notifications${withLimit(params)}`),
  unreadCount: () => apiRequest('/notifications/unread-count'),
  markRead: (notificationId) =>
    apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
};

export const reportsApi = {
  summary: () => apiRequest('/reports/summary'),
  recentActivity: () => apiRequest(`/activity${withLimit('', 100)}`),
};

// Backend "insights" routes: server-side calendar and timeline data so the UI
// never has to derive them from a truncated task/project list.
export const insightsApi = {
  calendarEvents: (params = '') => apiRequest(`/calendar/events${params}`),
  timelineProjects: () => apiRequest('/timeline/projects'),
};
