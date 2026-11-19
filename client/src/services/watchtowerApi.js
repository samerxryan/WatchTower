import { apiRequest } from './apiClient.js';
import { getPreviewRole, previewBackend } from './previewStore.js';

function isPreview() {
  return Boolean(getPreviewRole());
}

export const authApi = {
  me: () => (isPreview() ? Promise.resolve(previewBackend.getMe()) : apiRequest('/auth/me')),
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  logout: () => (isPreview() ? Promise.resolve({ success: true }) : apiRequest('/auth/logout', { method: 'POST' })),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: payload }),
};

export const usersApi = {
  list: () => (isPreview() ? Promise.resolve(previewBackend.listUsers()) : apiRequest('/users')),
  updateMe: (payload) =>
    isPreview() ? Promise.resolve(previewBackend.updateMe(payload)) : apiRequest('/users/me', { method: 'PATCH', body: payload }),
  updatePassword: (payload) =>
    isPreview()
      ? Promise.resolve({ success: true })
      : apiRequest('/users/me/password', { method: 'PATCH', body: payload }),
  updatePreferences: (payload) =>
    isPreview()
      ? Promise.resolve(previewBackend.updatePreferences(payload))
      : apiRequest('/users/me/preferences', { method: 'PATCH', body: payload }),
  updateRole: (userId, role) =>
    isPreview()
      ? Promise.resolve(previewBackend.updateUserRole(userId, role))
      : apiRequest(`/users/${userId}/role`, { method: 'PATCH', body: { role } }),
  updateStatus: (userId, isActive) =>
    isPreview()
      ? Promise.resolve(previewBackend.updateUserStatus(userId, isActive))
      : apiRequest(`/users/${userId}/status`, { method: 'PATCH', body: { isActive } }),
};

export const projectsApi = {
  list: (params = '') =>
    isPreview() ? Promise.resolve(previewBackend.listProjects()) : apiRequest(`/projects${params}`),
  get: (projectId) =>
    isPreview()
      ? Promise.resolve(previewBackend.getProject(projectId))
      : apiRequest(`/projects/${projectId}`),
  create: (payload) =>
    isPreview()
      ? Promise.resolve(previewBackend.createProject(payload))
      : apiRequest('/projects', { method: 'POST', body: payload }),
  update: (projectId, payload) =>
    isPreview()
      ? Promise.resolve(previewBackend.updateProject(projectId, payload))
      : apiRequest(`/projects/${projectId}`, { method: 'PATCH', body: payload }),
  archive: (projectId) =>
    isPreview()
      ? Promise.resolve(previewBackend.archiveProject(projectId))
      : apiRequest(`/projects/${projectId}`, { method: 'DELETE' }),
  addMember: (projectId, payload) =>
    isPreview()
      ? Promise.resolve(previewBackend.addProjectMember(projectId, payload))
      : apiRequest(`/projects/${projectId}/members`, { method: 'POST', body: payload }),
  removeMember: (projectId, userId) =>
    isPreview()
      ? Promise.resolve(previewBackend.removeProjectMember(projectId, userId))
      : apiRequest(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  activity: (projectId) =>
    isPreview()
      ? Promise.resolve(previewBackend.listActivity(projectId))
      : apiRequest(`/projects/${projectId}/activity`),
};

export const tasksApi = {
  listAll: () => (isPreview() ? Promise.resolve(previewBackend.listTasks()) : apiRequest('/tasks')),
  listByProject: (projectId) =>
    isPreview()
      ? Promise.resolve(previewBackend.listTasks(projectId))
      : apiRequest(`/projects/${projectId}/tasks`),
  create: (projectId, payload) =>
    isPreview()
      ? Promise.resolve(previewBackend.createTask(projectId, payload))
      : apiRequest(`/projects/${projectId}/tasks`, { method: 'POST', body: payload }),
  update: (taskId, payload) =>
    isPreview()
      ? Promise.resolve(previewBackend.updateTask(taskId, payload))
      : apiRequest(`/tasks/${taskId}`, { method: 'PATCH', body: payload }),
  updateStatus: (taskId, status) =>
    isPreview()
      ? Promise.resolve(previewBackend.updateTaskStatus(taskId, status))
      : apiRequest(`/tasks/${taskId}/status`, { method: 'PATCH', body: { status } }),
  remove: (taskId) =>
    isPreview()
      ? Promise.resolve(previewBackend.deleteTask(taskId))
      : apiRequest(`/tasks/${taskId}`, { method: 'DELETE' }),
  listComments: (taskId) =>
    isPreview()
      ? Promise.resolve(previewBackend.listComments(taskId))
      : apiRequest(`/tasks/${taskId}/comments`),
  addComment: (taskId, content) =>
    isPreview()
      ? Promise.resolve(previewBackend.addComment(taskId, content))
      : apiRequest(`/tasks/${taskId}/comments`, { method: 'POST', body: { content } }),
  deleteComment: (commentId) =>
    isPreview()
      ? Promise.resolve(previewBackend.deleteComment(commentId))
      : apiRequest(`/comments/${commentId}`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: () =>
    isPreview() ? Promise.resolve(previewBackend.listNotifications()) : apiRequest('/notifications'),
  markRead: (notificationId) =>
    isPreview()
      ? Promise.resolve(previewBackend.markNotificationRead(notificationId))
      : apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    isPreview()
      ? Promise.resolve(previewBackend.markAllNotificationsRead())
      : apiRequest('/notifications/read-all', { method: 'PATCH' }),
};

export const reportsApi = {
  summary: () =>
    isPreview() ? Promise.resolve(previewBackend.getReportsSummary()) : apiRequest('/reports/summary'),
  recentActivity: () =>
    isPreview() ? Promise.resolve(previewBackend.listActivity()) : apiRequest('/activity'),
};
