import * as notificationRepository from '../repositories/notificationRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as taskRepository from '../repositories/taskRepository.js';
import { serializePreferences, serializeUser } from '../utils/serializers.js';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function preferencesFor(userId, connection = null) {
  const row = await userRepository.findUserById(userId, connection);
  if (!row || !row.is_active) return null;
  return { row, user: serializeUser(row), preferences: serializePreferences(row) };
}

export async function notifyTaskAssigned({ task, project, actor, assigneeId }, connection = null) {
  if (!assigneeId || Number(assigneeId) === Number(actor.id)) return;
  const target = await preferencesFor(assigneeId, connection);
  if (!target || !target.preferences.assigned) return;

  await notificationRepository.insertNotification(
    {
      userId: Number(assigneeId),
      type: 'TASK_ASSIGNED',
      title: 'Task assigned',
      message: `${actor.fullName} assigned you to "${task.title}".`,
      payload: {
        taskId: Number(task.id),
        taskTitle: task.title,
        projectId: Number(project.id),
        projectName: project.name,
        actorName: actor.fullName,
      },
      relatedEntityType: 'task',
      relatedEntityId: Number(task.id),
    },
    connection,
  );
}

export async function notifyTaskStatusChanged(
  { task, project, actor, assigneeId, ownerId, previousStatus, nextStatus },
  connection = null,
) {
  const recipients = new Map();

  function addRecipient(row) {
    if (!row || !row.is_active) return;
    const id = Number(row.id);
    // No self-notifications, and one notification per user even when the
    // assignee is also the owner or a project manager.
    if (!id || id === Number(actor.id) || recipients.has(id)) return;
    if (!serializePreferences(row).statusChange) return;
    recipients.set(id, row);
  }

  if (assigneeId) {
    const target = await preferencesFor(assigneeId, connection);
    if (target) addRecipient(target.row);
  }

  const managers = await projectRepository.listProjectManagers(
    project.id,
    ownerId ?? project.ownerId ?? 0,
    connection,
  );
  for (const manager of managers) {
    addRecipient(manager);
  }

  const isCompleted = nextStatus === 'DONE';
  for (const userId of recipients.keys()) {
    await notificationRepository.insertNotification(
      {
        userId,
        type: isCompleted ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
        title: isCompleted ? 'Task completed' : 'Task status changed',
        message: isCompleted
          ? `${actor.fullName} completed "${task.title}".`
          : `${actor.fullName} moved "${task.title}" from ${previousStatus} to ${nextStatus}.`,
        payload: {
          taskId: Number(task.id),
          taskTitle: task.title,
          projectId: Number(project.id),
          projectName: project.name,
          actorName: actor.fullName,
          previousStatus,
          nextStatus,
        },
        relatedEntityType: 'task',
        relatedEntityId: Number(task.id),
      },
      connection,
    );
  }
}

export async function notifyProjectMemberAdded({ project, actor, addedUserId }, connection = null) {
  const target = await preferencesFor(addedUserId, connection);
  if (!target) return;

  await notificationRepository.insertNotification(
    {
      userId: Number(addedUserId),
      type: 'PROJECT_INVITE',
      title: 'Added to project',
      message: `${actor.fullName} added you to "${project.name}".`,
      payload: {
        projectId: Number(project.id),
        projectName: project.name,
        actorName: actor.fullName,
      },
      relatedEntityType: 'project',
      relatedEntityId: Number(project.id),
    },
    connection,
  );
}

/**
 * Deadline notifications are generated on demand with a per-day dedup key so
 * repeated page loads never create duplicates. A scheduler can call this for
 * every user later without changing the storage model.
 */
export async function generateDeadlineNotifications(user) {
  if (!user?.notificationPrefs?.dueSoon) return;

  const dateKey = todayKey();
  const [overdue, dueSoon] = await Promise.all([
    taskRepository.listOverdueTasksForUser(user.id),
    taskRepository.listDueSoonTasksForUser(user.id, 24),
  ]);

  for (const task of overdue) {
    await notificationRepository.insertNotification({
      userId: Number(user.id),
      type: 'TASK_OVERDUE',
      title: 'Task overdue',
      message: `"${task.title}" passed its deadline.`,
      payload: {
        taskId: Number(task.id),
        taskTitle: task.title,
        projectId: Number(task.project_id),
        projectName: task.project_name,
      },
      relatedEntityType: 'task',
      relatedEntityId: Number(task.id),
      dedupKey: `task_overdue:${task.id}:${dateKey}`,
    });
  }

  for (const task of dueSoon) {
    await notificationRepository.insertNotification({
      userId: Number(user.id),
      type: 'TASK_DUE_SOON',
      title: 'Task due soon',
      message: `"${task.title}" is due within 24 hours.`,
      payload: {
        taskId: Number(task.id),
        taskTitle: task.title,
        projectId: Number(task.project_id),
        projectName: task.project_name,
      },
      relatedEntityType: 'task',
      relatedEntityId: Number(task.id),
      dedupKey: `task_due_soon:${task.id}:${dateKey}`,
    });
  }
}
