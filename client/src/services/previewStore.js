// Local browser-only store used ONLY when the user explicitly activates
// "UI Preview Mode" before the backend endpoints are implemented.
// Never masquerades as a real MySQL connection.

const PREVIEW_ROLE_KEY = 'watchtower_ui_preview_role';
const PREVIEW_DATA_KEY = 'watchtower_ui_preview_data_v1';

function isoDaysOffset(days) {
  const d = new Date();
  d.setUTCHours(14, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function dateDaysOffset(days) {
  return isoDaysOffset(days).slice(0, 10);
}

function createInitialData() {
  return {
    users: [
      {
        id: 1,
        fullName: 'Claire Moreau',
        email: 'admin@watchtower.local',
        role: 'ADMIN',
        isActive: true,
        preferredLanguage: 'fr',
        preferredTheme: 'dark',
        notificationPrefs: { assigned: true, dueSoon: true, statusChange: true },
      },
      {
        id: 2,
        fullName: 'Lucas Bernard',
        email: 'manager@watchtower.local',
        role: 'PROJECT_MANAGER',
        isActive: true,
        preferredLanguage: 'fr',
        preferredTheme: 'light',
        notificationPrefs: { assigned: true, dueSoon: true, statusChange: true },
      },
      {
        id: 3,
        fullName: 'Sarah Jenkins',
        email: 'member@watchtower.local',
        role: 'TEAM_MEMBER',
        isActive: true,
        preferredLanguage: 'en',
        preferredTheme: 'light',
        notificationPrefs: { assigned: true, dueSoon: true, statusChange: false },
      },
      {
        id: 4,
        fullName: 'Nadia Benali',
        email: 'nadia@watchtower.local',
        role: 'TEAM_MEMBER',
        isActive: true,
        preferredLanguage: 'fr',
        preferredTheme: 'light',
        notificationPrefs: { assigned: true, dueSoon: true, statusChange: true },
      },
    ],
    projects: [
      {
        id: 1,
        name: 'WatchTower Core v1.0',
        description: 'Deliver the core SaaS workspace, JWT authentication, RBAC guards, and Kanban workflow.',
        status: 'ACTIVE',
        startDate: dateDaysOffset(-14),
        dueDate: dateDaysOffset(21),
        ownerId: 2,
        createdAt: isoDaysOffset(-14),
      },
      {
        id: 2,
        name: 'Security & Audit Hardening',
        description: 'Implement Helmet CSP, rate limiting, SQL parameterization audit, and integration tests.',
        status: 'PLANNING',
        startDate: dateDaysOffset(-2),
        dueDate: dateDaysOffset(35),
        ownerId: 2,
        createdAt: isoDaysOffset(-2),
      },
      {
        id: 3,
        name: 'Internal Operations Portal',
        description: 'Private administrative workspace not shared with external team members.',
        status: 'ON_HOLD',
        startDate: dateDaysOffset(-25),
        dueDate: dateDaysOffset(10),
        ownerId: 1,
        createdAt: isoDaysOffset(-25),
      },
    ],
    projectMembers: [
      { id: 1, projectId: 1, userId: 2, projectRole: 'MANAGER', joinedAt: isoDaysOffset(-14) },
      { id: 2, projectId: 1, userId: 3, projectRole: 'MEMBER', joinedAt: isoDaysOffset(-13) },
      { id: 3, projectId: 1, userId: 4, projectRole: 'MEMBER', joinedAt: isoDaysOffset(-12) },
      { id: 4, projectId: 2, userId: 2, projectRole: 'MANAGER', joinedAt: isoDaysOffset(-2) },
      { id: 5, projectId: 2, userId: 3, projectRole: 'MEMBER', joinedAt: isoDaysOffset(-1) },
      { id: 6, projectId: 3, userId: 1, projectRole: 'MANAGER', joinedAt: isoDaysOffset(-25) },
    ],
    tasks: [
      {
        id: 101,
        projectId: 1,
        title: 'Finalize MySQL schema & migrations',
        description: 'Verify foreign keys, indexes, and UTC timestamps across all 8 tables.',
        status: 'DONE',
        priority: 'URGENT',
        assigneeId: 2,
        createdBy: 2,
        dueDate: isoDaysOffset(-2),
        createdAt: isoDaysOffset(-12),
        completedAt: isoDaysOffset(-3),
      },
      {
        id: 102,
        projectId: 1,
        title: 'Implement Kanban drag-and-drop transitions',
        description: 'Allow authorized members to transition tasks between TODO, IN_PROGRESS, IN_REVIEW, and DONE.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeId: 3,
        createdBy: 2,
        dueDate: isoDaysOffset(2),
        createdAt: isoDaysOffset(-9),
        completedAt: null,
      },
      {
        id: 103,
        projectId: 1,
        title: 'Validate overdue task highlighting',
        description: 'Flag tasks past dueDate when status is not DONE across Kanban and Dashboard.',
        status: 'IN_REVIEW',
        priority: 'HIGH',
        assigneeId: 3,
        createdBy: 2,
        dueDate: isoDaysOffset(-1),
        createdAt: isoDaysOffset(-8),
        completedAt: null,
      },
      {
        id: 104,
        projectId: 1,
        title: 'Build FR/EN calendar month & week grid',
        description: 'Render task deadlines and project milestones with locale-aware formatting.',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: 4,
        createdBy: 2,
        dueDate: isoDaysOffset(6),
        createdAt: isoDaysOffset(-5),
        completedAt: null,
      },
      {
        id: 105,
        projectId: 2,
        title: 'Write RBAC integration test suite',
        description: 'Cover RBAC-01 through RBAC-08 scenarios against the REST API.',
        status: 'TODO',
        priority: 'URGENT',
        assigneeId: 3,
        createdBy: 2,
        dueDate: isoDaysOffset(4),
        createdAt: isoDaysOffset(-1),
        completedAt: null,
      },
      {
        id: 106,
        projectId: 3,
        title: 'Audit admin access logs',
        description: 'Internal admin-only task.',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        assigneeId: 1,
        createdBy: 1,
        dueDate: isoDaysOffset(8),
        createdAt: isoDaysOffset(-10),
        completedAt: null,
      },
    ],
    comments: [
      {
        id: 1,
        taskId: 102,
        authorId: 2,
        content: 'Make sure status changes remain accessible via keyboard controls as well as drag-and-drop.',
        createdAt: isoDaysOffset(-3),
        deletedAt: null,
      },
      {
        id: 2,
        taskId: 102,
        authorId: 3,
        content: 'Added an inline status selector on each Kanban card for keyboard accessibility.',
        createdAt: isoDaysOffset(-1),
        deletedAt: null,
      },
    ],
    notifications: [
      {
        id: 1,
        userId: 3,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned',
        message: 'Lucas Bernard assigned you to "Implement Kanban drag-and-drop transitions".',
        relatedEntityType: 'task',
        relatedEntityId: 102,
        isRead: false,
        createdAt: isoDaysOffset(-2),
      },
      {
        id: 2,
        userId: 3,
        type: 'TASK_OVERDUE',
        title: 'Task overdue',
        message: '"Validate overdue task highlighting" passed its deadline.',
        relatedEntityType: 'task',
        relatedEntityId: 103,
        isRead: false,
        createdAt: isoDaysOffset(-1),
      },
      {
        id: 3,
        userId: 2,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task moved to In Review',
        message: 'Sarah Jenkins moved "Validate overdue task highlighting" to IN_REVIEW.',
        relatedEntityType: 'task',
        relatedEntityId: 103,
        isRead: false,
        createdAt: isoDaysOffset(-1),
      },
      {
        id: 4,
        userId: 1,
        type: 'PROJECT_INVITE',
        title: 'Workspace active',
        message: 'WatchTower Core v1.0 workspace is active.',
        relatedEntityType: 'project',
        relatedEntityId: 1,
        isRead: true,
        createdAt: isoDaysOffset(-5),
      },
    ],
    activityLogs: [
      {
        id: 1,
        actorId: 2,
        projectId: 1,
        taskId: 101,
        action: 'TASK_COMPLETED',
        description: 'Completed "Finalize MySQL schema & migrations"',
        createdAt: isoDaysOffset(-3),
      },
      {
        id: 2,
        actorId: 3,
        projectId: 1,
        taskId: 103,
        action: 'STATUS_CHANGED',
        description: 'Moved "Validate overdue task highlighting" to IN_REVIEW',
        createdAt: isoDaysOffset(-1),
      },
      {
        id: 3,
        actorId: 2,
        projectId: 2,
        taskId: 105,
        action: 'TASK_CREATED',
        description: 'Created "Write RBAC integration test suite"',
        createdAt: isoDaysOffset(-1),
      },
    ],
    nextId: 200,
  };
}

function loadState() {
  if (typeof window === 'undefined') return createInitialData();
  const raw = window.sessionStorage.getItem(PREVIEW_DATA_KEY);
  if (!raw) {
    const initial = createInitialData();
    window.sessionStorage.setItem(PREVIEW_DATA_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const initial = createInitialData();
    window.sessionStorage.setItem(PREVIEW_DATA_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveState(state) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PREVIEW_DATA_KEY, JSON.stringify(state));
  }
}

export function getPreviewRole() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(PREVIEW_ROLE_KEY);
}

export function setPreviewRole(role) {
  if (typeof window === 'undefined') return;
  if (!role) {
    window.sessionStorage.removeItem(PREVIEW_ROLE_KEY);
  } else {
    window.sessionStorage.setItem(PREVIEW_ROLE_KEY, role);
  }
}

function currentUserFromState(state) {
  const role = getPreviewRole();
  if (!role) return null;
  return state.users.find((u) => u.role === role) || state.users[2];
}

function computeProgress(tasks, projectId) {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  const doneCount = projectTasks.filter((t) => t.status === 'DONE').length;
  return Math.round((doneCount / projectTasks.length) * 100);
}

function enrichProject(state, project) {
  const owner = state.users.find((u) => u.id === project.ownerId);
  const members = state.projectMembers.filter((m) => m.projectId === project.id);
  const projectTasks = state.tasks.filter((t) => t.projectId === project.id);
  return {
    ...project,
    ownerName: owner?.fullName || 'Unknown',
    memberCount: members.length,
    taskCount: projectTasks.length,
    completedTaskCount: projectTasks.filter((t) => t.status === 'DONE').length,
    progress: computeProgress(state.tasks, project.id),
  };
}

function enrichTask(state, task) {
  const assignee = state.users.find((u) => u.id === task.assigneeId);
  const project = state.projects.find((p) => p.id === task.projectId);
  const isOverdue =
    Boolean(task.dueDate) && task.status !== 'DONE' && new Date(task.dueDate).getTime() < Date.now();
  return {
    ...task,
    assigneeName: assignee?.fullName || null,
    projectName: project?.name || '',
    isOverdue,
  };
}

function accessibleProjectIds(state, user) {
  if (user.role === 'ADMIN') {
    return new Set(state.projects.map((p) => p.id));
  }
  const ids = new Set(
    state.projectMembers.filter((m) => m.userId === user.id).map((m) => m.projectId),
  );
  state.projects.filter((p) => p.ownerId === user.id).forEach((p) => ids.add(p.id));
  return ids;
}

function canManageProject(state, user, projectId) {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'PROJECT_MANAGER') return false;
  const project = state.projects.find((p) => p.id === Number(projectId));
  if (!project) return false;
  if (project.ownerId === user.id) return true;
  return state.projectMembers.some(
    (m) => m.projectId === Number(projectId) && m.userId === user.id && m.projectRole === 'MANAGER',
  );
}

export const previewBackend = {
  getMe() {
    const state = loadState();
    const user = currentUserFromState(state);
    return { success: true, data: user };
  },

  updateMe(updates) {
    const state = loadState();
    const user = currentUserFromState(state);
    if (!user) throw new Error('Unauthorized');
    if (updates.fullName !== undefined) user.fullName = updates.fullName;
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
    saveState(state);
    return { success: true, data: { ...user } };
  },

  updatePreferences(prefs) {
    const state = loadState();
    const user = currentUserFromState(state);
    if (!user) throw new Error('Unauthorized');
    if (prefs.preferredLanguage) user.preferredLanguage = prefs.preferredLanguage;
    if (prefs.preferredTheme) user.preferredTheme = prefs.preferredTheme;
    if (prefs.notificationPrefs) {
      user.notificationPrefs = { ...user.notificationPrefs, ...prefs.notificationPrefs };
    }
    saveState(state);
    return { success: true, data: { ...user } };
  },

  listUsers() {
    const state = loadState();
    const user = currentUserFromState(state);
    if (user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER') {
      throw new Error('Forbidden');
    }
    return { success: true, data: state.users.map(({ ...u }) => u) };
  },

  updateUserRole(userId, role) {
    const state = loadState();
    const current = currentUserFromState(state);
    if (current.role !== 'ADMIN') throw new Error('Forbidden');
    const target = state.users.find((u) => u.id === Number(userId));
    if (target) {
      target.role = role;
      saveState(state);
    }
    return { success: true, data: target };
  },

  updateUserStatus(userId, isActive) {
    const state = loadState();
    const current = currentUserFromState(state);
    if (current.role !== 'ADMIN') throw new Error('Forbidden');
    const target = state.users.find((u) => u.id === Number(userId));
    if (target) {
      target.isActive = isActive;
      saveState(state);
    }
    return { success: true, data: target };
  },

  listProjects() {
    const state = loadState();
    const user = currentUserFromState(state);
    const allowed = accessibleProjectIds(state, user);
    const rows = state.projects
      .filter((p) => allowed.has(p.id))
      .map((p) => enrichProject(state, p));
    return { success: true, data: rows, meta: { page: 1, limit: 50, total: rows.length, totalPages: 1 } };
  },

  getProject(projectId) {
    const state = loadState();
    const user = currentUserFromState(state);
    const allowed = accessibleProjectIds(state, user);
    const pid = Number(projectId);
    if (!allowed.has(pid)) throw new Error('Forbidden');
    const project = state.projects.find((p) => p.id === pid);
    if (!project) throw new Error('Not found');
    const members = state.projectMembers
      .filter((m) => m.projectId === pid)
      .map((m) => {
        const u = state.users.find((usr) => usr.id === m.userId);
        return {
          ...m,
          fullName: u?.fullName || 'Unknown',
          email: u?.email || '',
          globalRole: u?.role || 'TEAM_MEMBER',
        };
      });
    return { success: true, data: { ...enrichProject(state, project), members } };
  },

  createProject(payload) {
    const state = loadState();
    const user = currentUserFromState(state);
    if (user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER') throw new Error('Forbidden');
    const id = state.nextId++;
    const project = {
      id,
      name: payload.name,
      description: payload.description || '',
      status: payload.status || 'PLANNING',
      startDate: payload.startDate || null,
      dueDate: payload.dueDate || null,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    };
    state.projects.unshift(project);
    state.projectMembers.push({
      id: state.nextId++,
      projectId: id,
      userId: user.id,
      projectRole: 'MANAGER',
      joinedAt: new Date().toISOString(),
    });
    state.activityLogs.unshift({
      id: state.nextId++,
      actorId: user.id,
      projectId: id,
      taskId: null,
      action: 'PROJECT_CREATED',
      description: `Created project "${project.name}"`,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return { success: true, data: enrichProject(state, project) };
  },

  updateProject(projectId, payload) {
    const state = loadState();
    const user = currentUserFromState(state);
    const pid = Number(projectId);
    if (!canManageProject(state, user, pid)) throw new Error('Forbidden');
    const project = state.projects.find((p) => p.id === pid);
    if (!project) throw new Error('Not found');
    Object.assign(project, {
      name: payload.name ?? project.name,
      description: payload.description ?? project.description,
      status: payload.status ?? project.status,
      startDate: payload.startDate !== undefined ? payload.startDate : project.startDate,
      dueDate: payload.dueDate !== undefined ? payload.dueDate : project.dueDate,
    });
    saveState(state);
    return { success: true, data: enrichProject(state, project) };
  },

  archiveProject(projectId) {
    const state = loadState();
    const user = currentUserFromState(state);
    const pid = Number(projectId);
    if (!canManageProject(state, user, pid)) throw new Error('Forbidden');
    const project = state.projects.find((p) => p.id === pid);
    if (project) {
      project.status = 'ARCHIVED';
      project.archivedAt = new Date().toISOString();
      saveState(state);
    }
    return { success: true, data: project };
  },

  addProjectMember(projectId, { userId, projectRole = 'MEMBER' }) {
    const state = loadState();
    const user = currentUserFromState(state);
    const pid = Number(projectId);
    if (!canManageProject(state, user, pid)) throw new Error('Forbidden');
    const exists = state.projectMembers.some(
      (m) => m.projectId === pid && m.userId === Number(userId),
    );
    if (exists) throw new Error('User is already a member of this project.');
    const member = {
      id: state.nextId++,
      projectId: pid,
      userId: Number(userId),
      projectRole,
      joinedAt: new Date().toISOString(),
    };
    state.projectMembers.push(member);
    state.notifications.unshift({
      id: state.nextId++,
      userId: Number(userId),
      type: 'PROJECT_INVITE',
      title: 'Added to project',
      message: `You were added to project #${pid}.`,
      relatedEntityType: 'project',
      relatedEntityId: pid,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return { success: true, data: member };
  },

  removeProjectMember(projectId, userId) {
    const state = loadState();
    const user = currentUserFromState(state);
    const pid = Number(projectId);
    if (!canManageProject(state, user, pid)) throw new Error('Forbidden');
    state.projectMembers = state.projectMembers.filter(
      (m) => !(m.projectId === pid && m.userId === Number(userId)),
    );
    saveState(state);
    return { success: true };
  },

  listTasks(projectId = null) {
    const state = loadState();
    const user = currentUserFromState(state);
    const allowed = accessibleProjectIds(state, user);
    const rows = state.tasks
      .filter((t) => allowed.has(t.projectId))
      .filter((t) => (!projectId ? true : t.projectId === Number(projectId)))
      .map((t) => enrichTask(state, t));
    return { success: true, data: rows };
  },

  createTask(projectId, payload) {
    const state = loadState();
    const user = currentUserFromState(state);
    const pid = Number(projectId);
    if (!canManageProject(state, user, pid)) throw new Error('Forbidden');
    const id = state.nextId++;
    const task = {
      id,
      projectId: pid,
      title: payload.title,
      description: payload.description || '',
      status: payload.status || 'TODO',
      priority: payload.priority || 'MEDIUM',
      assigneeId: payload.assigneeId ? Number(payload.assigneeId) : null,
      createdBy: user.id,
      dueDate: payload.dueDate || null,
      createdAt: new Date().toISOString(),
      completedAt: payload.status === 'DONE' ? new Date().toISOString() : null,
    };
    state.tasks.unshift(task);
    state.activityLogs.unshift({
      id: state.nextId++,
      actorId: user.id,
      projectId: pid,
      taskId: id,
      action: 'TASK_CREATED',
      description: `Created task "${task.title}"`,
      createdAt: new Date().toISOString(),
    });
    if (task.assigneeId) {
      state.notifications.unshift({
        id: state.nextId++,
        userId: task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned',
        message: `${user.fullName} assigned you to "${task.title}".`,
        relatedEntityType: 'task',
        relatedEntityId: id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
    saveState(state);
    return { success: true, data: enrichTask(state, task) };
  },

  updateTask(taskId, payload) {
    const state = loadState();
    const user = currentUserFromState(state);
    const task = state.tasks.find((t) => t.id === Number(taskId));
    if (!task) throw new Error('Not found');
    const allowed = accessibleProjectIds(state, user);
    if (!allowed.has(task.projectId)) throw new Error('Forbidden');
    Object.assign(task, {
      title: payload.title ?? task.title,
      description: payload.description ?? task.description,
      priority: payload.priority ?? task.priority,
      status: payload.status ?? task.status,
      dueDate: payload.dueDate !== undefined ? payload.dueDate : task.dueDate,
      assigneeId:
        payload.assigneeId !== undefined
          ? payload.assigneeId
            ? Number(payload.assigneeId)
            : null
          : task.assigneeId,
    });
    if (task.status === 'DONE' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    } else if (task.status !== 'DONE') {
      task.completedAt = null;
    }
    saveState(state);
    return { success: true, data: enrichTask(state, task) };
  },

  updateTaskStatus(taskId, status) {
    const state = loadState();
    const user = currentUserFromState(state);
    const task = state.tasks.find((t) => t.id === Number(taskId));
    if (!task) throw new Error('Not found');
    const allowed = accessibleProjectIds(state, user);
    if (!allowed.has(task.projectId)) throw new Error('Forbidden');
    task.status = status;
    task.completedAt = status === 'DONE' ? new Date().toISOString() : null;
    state.activityLogs.unshift({
      id: state.nextId++,
      actorId: user.id,
      projectId: task.projectId,
      taskId: task.id,
      action: 'STATUS_CHANGED',
      description: `Moved "${task.title}" to ${status}`,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return { success: true, data: enrichTask(state, task) };
  },

  deleteTask(taskId) {
    const state = loadState();
    const user = currentUserFromState(state);
    const task = state.tasks.find((t) => t.id === Number(taskId));
    if (!task) return { success: true };
    if (!canManageProject(state, user, task.projectId)) throw new Error('Forbidden');
    state.tasks = state.tasks.filter((t) => t.id !== Number(taskId));
    saveState(state);
    return { success: true };
  },

  listComments(taskId) {
    const state = loadState();
    const rows = state.comments
      .filter((c) => c.taskId === Number(taskId) && !c.deletedAt)
      .map((c) => {
        const author = state.users.find((u) => u.id === c.authorId);
        return { ...c, authorName: author?.fullName || 'Unknown' };
      });
    return { success: true, data: rows };
  },

  addComment(taskId, content) {
    const state = loadState();
    const user = currentUserFromState(state);
    const comment = {
      id: state.nextId++,
      taskId: Number(taskId),
      authorId: user.id,
      content,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    state.comments.push(comment);
    saveState(state);
    return { success: true, data: { ...comment, authorName: user.fullName } };
  },

  deleteComment(commentId) {
    const state = loadState();
    const user = currentUserFromState(state);
    const comment = state.comments.find((c) => c.id === Number(commentId));
    if (comment && (comment.authorId === user.id || user.role === 'ADMIN')) {
      comment.deletedAt = new Date().toISOString();
      saveState(state);
    }
    return { success: true };
  },

  listActivity(projectId = null) {
    const state = loadState();
    const user = currentUserFromState(state);
    const allowed = accessibleProjectIds(state, user);
    const rows = state.activityLogs
      .filter((a) => (!a.projectId ? true : allowed.has(a.projectId)))
      .filter((a) => (!projectId ? true : a.projectId === Number(projectId)))
      .map((a) => {
        const actor = state.users.find((u) => u.id === a.actorId);
        return { ...a, actorName: actor?.fullName || 'System' };
      });
    return { success: true, data: rows };
  },

  listNotifications() {
    const state = loadState();
    const user = currentUserFromState(state);
    const rows = state.notifications.filter((n) => n.userId === user.id);
    return { success: true, data: rows };
  },

  markNotificationRead(notificationId) {
    const state = loadState();
    const user = currentUserFromState(state);
    const target = state.notifications.find(
      (n) => n.id === Number(notificationId) && n.userId === user.id,
    );
    if (target) {
      target.isRead = true;
      target.readAt = new Date().toISOString();
      saveState(state);
    }
    return { success: true, data: target };
  },

  markAllNotificationsRead() {
    const state = loadState();
    const user = currentUserFromState(state);
    const now = new Date().toISOString();
    state.notifications.forEach((n) => {
      if (n.userId === user.id && !n.isRead) {
        n.isRead = true;
        n.readAt = now;
      }
    });
    saveState(state);
    return { success: true };
  },

  getReportsSummary() {
    const state = loadState();
    const user = currentUserFromState(state);
    const allowed = accessibleProjectIds(state, user);
    const projects = state.projects.filter((p) => allowed.has(p.id)).map((p) => enrichProject(state, p));
    const tasks = state.tasks.filter((t) => allowed.has(t.projectId)).map((t) => enrichTask(state, t));
    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const pending = tasks.length - completed;
    const overdue = tasks.filter((t) => t.isOverdue).length;
    const overallProgress = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
    return {
      success: true,
      data: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        overallProgress,
        projects,
        tasksByStatus: {
          TODO: tasks.filter((t) => t.status === 'TODO').length,
          IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
          IN_REVIEW: tasks.filter((t) => t.status === 'IN_REVIEW').length,
          DONE: completed,
        },
        tasksByPriority: {
          LOW: tasks.filter((t) => t.priority === 'LOW').length,
          MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM').length,
          HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
          URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
        },
      },
    };
  },
};
