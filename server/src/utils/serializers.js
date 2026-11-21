import { isOverdue, toDateOnly, toIsoString } from './dates.js';

export const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
  assigned: true,
  dueSoon: true,
  statusChange: true,
});

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function serializePreferences(row) {
  const stored = parseJson(row.notification_prefs, null);
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(stored && typeof stored === 'object' ? stored : {}),
  };
}

export function serializeUser(row, options = {}) {
  if (!row) return null;
  const { includePreferences = true } = options;
  const user = {
    id: Number(row.id),
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url ?? null,
    isActive: Boolean(row.is_active),
    preferredLanguage: row.preferred_language,
    preferredTheme: row.preferred_theme,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
  if (includePreferences) {
    user.notificationPrefs = serializePreferences(row);
  }
  return user;
}

export function serializePublicUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url ?? null,
    isActive: Boolean(row.is_active),
  };
}

export function serializeProject(row) {
  if (!row) return null;
  const taskCount = Number(row.task_count ?? 0);
  const completedTaskCount = Number(row.completed_task_count ?? 0);
  const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    startDate: toDateOnly(row.start_date),
    dueDate: toDateOnly(row.due_date),
    ownerId: Number(row.owner_id),
    ownerName: row.owner_name ?? null,
    memberCount: Number(row.member_count ?? 0),
    taskCount,
    completedTaskCount,
    progress,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    archivedAt: toIsoString(row.archived_at),
  };
}

export function serializeProjectMember(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    userId: Number(row.user_id),
    projectRole: row.project_role,
    joinedAt: toIsoString(row.joined_at),
    fullName: row.full_name ?? null,
    email: row.email ?? null,
    globalRole: row.global_role ?? null,
  };
}

export function serializeTask(row) {
  if (!row) return null;
  const dueDate = toIsoString(row.due_date);
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id === null || row.assignee_id === undefined ? null : Number(row.assignee_id),
    createdBy: Number(row.created_by),
    dueDate,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    completedAt: toIsoString(row.completed_at),
    assigneeName: row.assignee_name ?? null,
    projectName: row.project_name ?? '',
    isOverdue: isOverdue(row.due_date, row.status),
  };
}

export function serializeComment(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    taskId: Number(row.task_id),
    authorId: Number(row.author_id),
    authorName: row.author_name ?? null,
    content: row.content,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toIsoString(row.deleted_at),
  };
}

export function serializeNotification(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    type: row.type,
    title: row.title,
    message: row.message,
    payload: parseJson(row.payload, null),
    relatedEntityType: row.related_entity_type ?? null,
    relatedEntityId:
      row.related_entity_id === null || row.related_entity_id === undefined
        ? null
        : Number(row.related_entity_id),
    isRead: Boolean(row.is_read),
    createdAt: toIsoString(row.created_at),
    readAt: toIsoString(row.read_at),
  };
}

export function serializeActivity(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    actorId: row.actor_id === null || row.actor_id === undefined ? null : Number(row.actor_id),
    actorName: row.actor_name ?? 'System',
    projectId: row.project_id === null || row.project_id === undefined ? null : Number(row.project_id),
    taskId: row.task_id === null || row.task_id === undefined ? null : Number(row.task_id),
    projectName: row.project_name ?? null,
    action: row.action,
    description: row.description,
    createdAt: toIsoString(row.created_at),
  };
}
