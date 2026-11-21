import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';

export function projectPermissions(row, user) {
  const isAdmin = user.role === 'ADMIN';
  const isOwner = Number(row.owner_id) === Number(user.id);
  const isMember = Boolean(row.member_role) || isOwner;
  const memberRole = row.member_role ?? (isOwner ? 'MANAGER' : null);

  return {
    isAdmin,
    isOwner,
    isMember,
    memberRole,
    canView: isAdmin || isMember,
    canManage: isAdmin || isOwner || memberRole === 'MANAGER',
  };
}

export function assertProjectAccess(projectRow, user, { manage = false } = {}) {
  if (!projectRow) {
    throw Errors.notFound('Projet introuvable.');
  }
  const permissions = projectPermissions(projectRow, user);
  if (!permissions.canView) {
    throw Errors.forbidden("Vous n'avez pas accès à ce projet.");
  }
  if (manage && !permissions.canManage) {
    throw Errors.forbidden('Vous ne pouvez pas gérer ce projet.');
  }
  return permissions;
}

export function assertProjectWritable(projectRow) {
  if (projectRow.status === 'ARCHIVED') {
    throw Errors.conflict('Ce projet est archivé et ne peut plus être modifié.');
  }
}

export function taskPermissions(taskRow, user) {
  const isAdmin = user.role === 'ADMIN';
  const isOwner = Number(taskRow.project_owner_id) === Number(user.id);
  const isAssignee = Number(taskRow.assignee_id) === Number(user.id);
  const isMember = Boolean(taskRow.member_role) || isOwner;
  const memberRole = taskRow.member_role ?? (isOwner ? 'MANAGER' : null);

  return {
    isAdmin,
    isOwner,
    isAssignee,
    isMember,
    memberRole,
    canView: isAdmin || isMember,
    canManage: isAdmin || isOwner || memberRole === 'MANAGER',
    // Any project member may move a task on the Kanban board; only managers
    // and the owner may edit other task fields.
    canChangeStatus: isAdmin || isMember,
  };
}

export function assertTaskAccess(taskRow, user) {
  if (!taskRow) {
    throw Errors.notFound('Tâche introuvable.');
  }
  const permissions = taskPermissions(taskRow, user);
  if (!permissions.canView) {
    throw Errors.forbidden("Vous n'avez pas accès à cette tâche.");
  }
  return permissions;
}

export function ensureProjectWritableStatus(status) {
  if (status === 'ARCHIVED') {
    throw Errors.conflict('Ce projet est archivé et ne peut plus être modifié.');
  }
}

export function isTestEnvironment() {
  return env.isTest;
}
