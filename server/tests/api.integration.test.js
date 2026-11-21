import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../src/config/env.js';
import { closePool, execute } from '../src/database/pool.js';
import { hashToken } from '../src/utils/tokens.js';
import {
  buildApp,
  cookieFrom,
  createUser,
  login,
  loginAgent,
  prepareDatabase,
  resetData,
} from './helpers.js';

const PASSWORD = 'Password123!';

let app;
let admin;
let manager;
let member;
let adminAgent;
let managerAgent;
let memberAgent;

async function createProject(agent, overrides = {}) {
  const response = await agent.post('/api/v1/projects').send({
    name: 'Integration Project',
    description: 'Created by the integration test suite.',
    startDate: '2026-01-01',
    dueDate: '2026-12-31',
    ...overrides,
  });
  return response;
}

async function addMember(agent, projectId, userId, projectRole = 'MEMBER') {
  return agent
    .post(`/api/v1/projects/${projectId}/members`)
    .send({ userId, projectRole });
}

async function createTask(agent, projectId, overrides = {}) {
  return agent.post(`/api/v1/projects/${projectId}/tasks`).send({
    title: 'Integration Task',
    description: 'Task created by the integration test suite.',
    priority: 'HIGH',
    dueDate: '2026-12-30T14:00:00.000Z',
    ...overrides,
  });
}

describe('WatchTower API integration', () => {
  beforeAll(async () => {
    await prepareDatabase();
  });

  beforeEach(async () => {
    await resetData();
    app = buildApp();

    admin = await createUser({
      fullName: 'Ada Admin',
      email: 'admin@test.local',
      role: 'ADMIN',
    });
    manager = await createUser({
      fullName: 'Marc Manager',
      email: 'manager@test.local',
      role: 'PROJECT_MANAGER',
    });
    member = await createUser({
      fullName: 'Mia Member',
      email: 'member@test.local',
      role: 'TEAM_MEMBER',
    });

    adminAgent = await loginAgent(app, 'admin@test.local');
    managerAgent = await loginAgent(app, 'manager@test.local');
    memberAgent = await loginAgent(app, 'member@test.local');
  });

  afterAll(async () => {
    await closePool();
  });

  it('registers a standard account and never accepts a privileged role from the body', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      fullName: 'New Person',
      email: 'new@test.local',
      password: PASSWORD,
      role: 'ADMIN',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('TEAM_MEMBER');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(response.body.data.user.notificationPrefs.assigned).toBe(true);

    const duplicate = await request(app).post('/api/v1/auth/register').send({
      fullName: 'New Person',
      email: 'new@test.local',
      password: PASSWORD,
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('logs in with generic errors, sets HttpOnly cookies, and revokes the refresh session on logout', async () => {
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@test.local', password: 'WrongPassword1!' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toBe('Email ou mot de passe incorrect.');

    const response = await login(app, 'member@test.local');
    expect(response.body.data.user.email).toBe('member@test.local');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');

    const accessCookie = cookieFrom(response, 'wt_access');
    const refreshCookie = cookieFrom(response, 'wt_refresh');
    expect(accessCookie).toBeTruthy();
    expect(refreshCookie).toBeTruthy();
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');

    const me = await request(app).get('/api/v1/auth/me').set('Cookie', accessCookie);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('member@test.local');

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${accessCookie}; ${refreshCookie}`);
    expect(logout.status).toBe(200);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(refresh.status).toBe(401);
  });

  it('rejects unauthenticated and tampered access tokens', async () => {
    for (const path of ['/api/v1/projects', '/api/v1/tasks', '/api/v1/users', '/api/v1/notifications']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    }

    const tampered = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'wt_access=not-a-valid-jwt');
    expect(tampered.status).toBe(401);
  });

  it('enforces the admin-only user directory while allowing limited manager access', async () => {
    const memberList = await memberAgent.get('/api/v1/users');
    expect(memberList.status).toBe(403);

    const managerList = await managerAgent.get('/api/v1/users');
    expect(managerList.status).toBe(200);
    expect(managerList.body.data).toHaveLength(3);
    expect(managerList.body.data[0]).not.toHaveProperty('notificationPrefs');
    expect(managerList.body.data[0]).not.toHaveProperty('createdAt');

    const adminList = await adminAgent.get('/api/v1/users');
    expect(adminList.status).toBe(200);
    expect(adminList.body.data[0]).toHaveProperty('notificationPrefs');

    const selfUpdate = await memberAgent
      .patch('/api/v1/users/me')
      .send({ fullName: 'Mia Updated', role: 'ADMIN' });
    expect(selfUpdate.status).toBe(200);
    expect(selfUpdate.body.data.role).toBe('TEAM_MEMBER');
    expect(selfUpdate.body.data.fullName).toBe('Mia Updated');

    const roleUpdate = await memberAgent
      .patch(`/api/v1/users/${admin.id}/role`)
      .send({ role: 'TEAM_MEMBER' });
    expect(roleUpdate.status).toBe(403);

    const adminRoleUpdate = await adminAgent
      .patch(`/api/v1/users/${member.id}/role`)
      .send({ role: 'TEAM_MEMBER' });
    expect(adminRoleUpdate.status).toBe(200);
  });

  it('persists preferences and merges notification flags', async () => {
    const response = await memberAgent.patch('/api/v1/users/me/preferences').send({
      preferredLanguage: 'en',
      preferredTheme: 'dark',
      notificationPrefs: { statusChange: false },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.preferredLanguage).toBe('en');
    expect(response.body.data.preferredTheme).toBe('dark');
    expect(response.body.data.notificationPrefs).toEqual({
      assigned: true,
      dueSoon: true,
      statusChange: false,
    });

    const me = await memberAgent.get('/api/v1/auth/me');
    expect(me.body.data.preferredLanguage).toBe('en');
    expect(me.body.data.notificationPrefs.statusChange).toBe(false);
  });

  it('verifies the current password and rotates sessions on password change', async () => {
    const wrong = await memberAgent.patch('/api/v1/users/me/password').send({
      currentPassword: 'WrongPassword1!',
      newPassword: 'BrandNewPass1!',
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('INVALID_PASSWORD');

    const changed = await memberAgent.patch('/api/v1/users/me/password').send({
      currentPassword: PASSWORD,
      newPassword: 'BrandNewPass1!',
    });
    expect(changed.status).toBe(200);

    const me = await memberAgent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@test.local', password: PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@test.local', password: 'BrandNewPass1!' });
    expect(newLogin.status).toBe(200);
  });

  it('creates projects, hides them from non-members, and exposes members on detail', async () => {
    const created = await createProject(managerAgent, { name: 'Owned by Manager' });
    expect(created.status).toBe(201);
    expect(created.body.data.ownerId).toBe(manager.id);
    expect(created.body.data.memberCount).toBe(1);
    expect(created.body.data.progress).toBe(0);

    const projectId = created.body.data.id;

    const managerList = await managerAgent.get('/api/v1/projects');
    expect(managerList.status).toBe(200);
    expect(managerList.body.meta.total).toBe(1);

    const memberList = await memberAgent.get('/api/v1/projects');
    expect(memberList.body.meta.total).toBe(0);

    const hidden = await memberAgent.get(`/api/v1/projects/${projectId}`);
    expect(hidden.status).toBe(403);

    const added = await addMember(managerAgent, projectId, member.id);
    expect(added.status).toBe(201);

    const visible = await memberAgent.get(`/api/v1/projects/${projectId}`);
    expect(visible.status).toBe(200);
    expect(visible.body.data.members).toHaveLength(2);
    expect(visible.body.data.members.map((entry) => entry.userId)).toContain(member.id);

    const adminDetail = await adminAgent.get(`/api/v1/projects/${projectId}`);
    expect(adminDetail.status).toBe(200);
  });

  it('validates project dates and blocks managers from projects they do not manage', async () => {
    const invalidDates = await createProject(managerAgent, {
      startDate: '2026-12-31',
      dueDate: '2026-01-01',
    });
    expect(invalidDates.status).toBe(422);

    const emptyName = await createProject(managerAgent, { name: '' });
    expect(emptyName.status).toBe(400);

    const adminProject = await createProject(adminAgent, { name: 'Admin Project' });
    expect(adminProject.status).toBe(201);

    const forbiddenUpdate = await managerAgent
      .patch(`/api/v1/projects/${adminProject.body.data.id}`)
      .send({ name: 'Hijacked' });
    expect(forbiddenUpdate.status).toBe(403);
  });

  it('enforces member rules and prevents removing the project owner', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;

    const first = await addMember(managerAgent, projectId, member.id);
    expect(first.status).toBe(201);

    const duplicate = await addMember(managerAgent, projectId, member.id);
    expect(duplicate.status).toBe(409);

    const missing = await addMember(managerAgent, projectId, 999999);
    expect(missing.status).toBe(404);

    const removeOwner = await managerAgent.delete(
      `/api/v1/projects/${projectId}/members/${manager.id}`,
    );
    expect(removeOwner.status).toBe(422);

    const removeMember = await managerAgent.delete(
      `/api/v1/projects/${projectId}/members/${member.id}`,
    );
    expect(removeMember.status).toBe(200);

    const afterRemoval = await memberAgent.get(`/api/v1/projects/${projectId}`);
    expect(afterRemoval.status).toBe(403);
  });

  it('handles task creation, assignee rules, status permissions, comments, and progress', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);

    const nonMemberTask = await createTask(managerAgent, projectId, {
      title: 'Invalid assignee',
      assigneeId: admin.id,
    });
    expect(nonMemberTask.status).toBe(422);

    const taskResponse = await createTask(managerAgent, projectId, {
      title: 'Member task',
      assigneeId: member.id,
    });
    expect(taskResponse.status).toBe(201);
    expect(taskResponse.body.data.assigneeName).toBe('Mia Member');
    expect(taskResponse.body.data.projectName).toBe('Integration Project');
    expect(taskResponse.body.data.isOverdue).toBe(false);

    const taskId = taskResponse.body.data.id;

    const status = await memberAgent
      .patch(`/api/v1/tasks/${taskId}/status`)
      .send({ status: 'IN_PROGRESS' });
    expect(status.status).toBe(200);
    expect(status.body.data.status).toBe('IN_PROGRESS');

    const forbiddenEdit = await memberAgent
      .patch(`/api/v1/tasks/${taskId}`)
      .send({ title: 'Hijacked title' });
    expect(forbiddenEdit.status).toBe(403);

    const managerEdit = await managerAgent
      .patch(`/api/v1/tasks/${taskId}`)
      .send({ title: 'Manager updated title' });
    expect(managerEdit.status).toBe(200);
    expect(managerEdit.body.data.title).toBe('Manager updated title');

    const comment = await memberAgent
      .post(`/api/v1/tasks/${taskId}/comments`)
      .send({ content: 'First comment from member.' });
    expect(comment.status).toBe(201);
    expect(comment.body.data.authorName).toBe('Mia Member');

    const comments = await memberAgent.get(`/api/v1/tasks/${taskId}/comments`);
    expect(comments.status).toBe(200);
    expect(comments.body.data).toHaveLength(1);

    const deleted = await memberAgent.delete(`/api/v1/comments/${comment.body.data.id}`);
    expect(deleted.status).toBe(200);
    const afterDelete = await managerAgent.get(`/api/v1/tasks/${taskId}/comments`);
    expect(afterDelete.body.data).toHaveLength(0);

    const done = await managerAgent
      .patch(`/api/v1/tasks/${taskId}/status`)
      .send({ status: 'DONE' });
    expect(done.status).toBe(200);
    expect(done.body.data.completedAt).toBeTruthy();

    const detail = await managerAgent.get(`/api/v1/projects/${projectId}`);
    expect(detail.body.data.taskCount).toBe(1);
    expect(detail.body.data.completedTaskCount).toBe(1);
    expect(detail.body.data.progress).toBe(100);
  });

  it('makes archived projects read-only', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);
    const task = await createTask(managerAgent, projectId, { assigneeId: member.id });

    const archived = await managerAgent.delete(`/api/v1/projects/${projectId}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');

    const update = await managerAgent
      .patch(`/api/v1/projects/${projectId}`)
      .send({ name: 'Cannot rename' });
    expect(update.status).toBe(409);

    const newTask = await createTask(managerAgent, projectId);
    expect(newTask.status).toBe(409);

    const comment = await memberAgent
      .post(`/api/v1/tasks/${task.body.data.id}/comments`)
      .send({ content: 'Should fail' });
    expect(comment.status).toBe(409);
  });

  it('creates assignment notifications and prevents cross-account access', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);
    await createTask(managerAgent, projectId, { title: 'Notify me', assigneeId: member.id });

    const list = await memberAgent.get('/api/v1/notifications');
    expect(list.status).toBe(200);
    const assignment = list.body.data.find((entry) => entry.type === 'TASK_ASSIGNED');
    expect(assignment).toBeTruthy();
    expect(assignment.isRead).toBe(false);

    const crossAccount = await adminAgent.patch(
      `/api/v1/notifications/${assignment.id}/read`,
    );
    expect(crossAccount.status).toBe(404);

    const before = await memberAgent.get('/api/v1/notifications/unread-count');
    expect(before.body.data.count).toBeGreaterThan(0);

    const read = await memberAgent.patch(`/api/v1/notifications/${assignment.id}/read`);
    expect(read.status).toBe(200);
    expect(read.body.data.isRead).toBe(true);

    const markAll = await memberAgent.patch('/api/v1/notifications/read-all');
    expect(markAll.status).toBe(200);

    const after = await memberAgent.get('/api/v1/notifications/unread-count');
    expect(after.body.data.count).toBe(0);
  });

  it('returns accessible reports, activity, timeline, and calendar data', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);
    const task = await createTask(managerAgent, projectId, { assigneeId: member.id });
    await managerAgent
      .patch(`/api/v1/tasks/${task.body.data.id}/status`)
      .send({ status: 'IN_PROGRESS' });

    const summary = await managerAgent.get('/api/v1/reports/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.data.totalProjects).toBe(1);
    expect(summary.body.data.totalTasks).toBe(1);
    expect(summary.body.data.tasksByStatus.IN_PROGRESS).toBe(1);
    expect(summary.body.data.projects[0].progress).toBe(0);

    const activity = await memberAgent.get('/api/v1/activity');
    expect(activity.status).toBe(200);
    expect(activity.body.data.length).toBeGreaterThan(0);

    const projectActivity = await managerAgent.get(`/api/v1/projects/${projectId}/activity`);
    expect(projectActivity.status).toBe(200);
    expect(projectActivity.body.data.length).toBeGreaterThan(0);

    const timeline = await managerAgent.get('/api/v1/timeline/projects');
    expect(timeline.status).toBe(200);
    expect(timeline.body.data[0].id).toBe(projectId);

    const calendar = await managerAgent.get(
      '/api/v1/calendar/events?from=2026-01-01&to=2026-12-31',
    );
    expect(calendar.status).toBe(200);
    expect(calendar.body.data.some((event) => event.type === 'TASK_DUE')).toBe(true);
  });

  it('paginates collections with server-side metadata', async () => {
    for (const name of ['Alpha', 'Beta', 'Gamma']) {
      const created = await createProject(managerAgent, { name });
      expect(created.status).toBe(201);
    }

    const page = await managerAgent.get('/api/v1/projects?page=2&limit=2');
    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });

    const capped = await managerAgent.get('/api/v1/projects?limit=500');
    expect(capped.status).toBe(400);
  });

  it('lists all accessible tasks for dashboard and Kanban views', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);
    await createTask(managerAgent, projectId, { title: 'Visible task', assigneeId: member.id });

    const managerTasks = await managerAgent.get('/api/v1/tasks');
    expect(managerTasks.status).toBe(200);
    expect(managerTasks.body.data).toHaveLength(1);
    expect(managerTasks.body.data[0].title).toBe('Visible task');

    const memberTasks = await memberAgent.get('/api/v1/tasks');
    expect(memberTasks.status).toBe(200);
    expect(memberTasks.body.data).toHaveLength(1);

    const adminTasks = await adminAgent.get('/api/v1/tasks');
    expect(adminTasks.status).toBe(200);
  });

  it('rotates refresh tokens and renews an expired access token from a live session', async () => {
    const signedIn = await login(app, 'member@test.local');
    const refresh = cookieFrom(signedIn, 'wt_refresh');
    expect(refresh).toBeTruthy();

    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', refresh);
    expect(rotated.status).toBe(200);
    const rotatedRefresh = cookieFrom(rotated, 'wt_refresh');
    expect(rotatedRefresh).toBeTruthy();
    expect(rotatedRefresh).not.toBe(refresh);

    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', refresh);
    expect(replay.status).toBe(401);

    const expired = jwt.sign(
      { role: 'TEAM_MEMBER', typ: 'access' },
      env.jwt.secret,
      {
        subject: String(member.id),
        expiresIn: '-1s',
        issuer: 'watchtower',
        audience: 'watchtower-web',
        algorithm: 'HS256',
      },
    );

    const expiredOnly = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `wt_access=${expired}`);
    expect(expiredOnly.status).toBe(401);

    const renewed = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `wt_access=${expired}; ${rotatedRefresh}`);
    expect(renewed.status).toBe(200);
    expect(renewed.body.data.email).toBe('member@test.local');
    expect(String(renewed.headers['set-cookie'] || [])).toContain('wt_access=');
  });

  it('handles forgot/reset password and rejects an expired reset token', async () => {
    const first = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'member@test.local' });
    expect(first.status).toBe(200);
    const expiredToken = first.body.data.resetToken;
    expect(expiredToken).toBeTruthy();

    await execute(
      `UPDATE password_reset_tokens
       SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE
       WHERE token_hash = ?`,
      [hashToken(expiredToken)],
    );

    const expired = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: expiredToken, newPassword: 'ExpiredPass1!' });
    expect(expired.status).toBe(400);
    expect(expired.body.error.code).toBe('INVALID_RESET_TOKEN');

    const second = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'member@test.local' });
    const token = second.body.data.resetToken;
    const reused = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'ResetPass123!' });
    expect(reused.status).toBe(200);

    const replay = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'ResetPass123!' });
    expect(replay.status).toBe(400);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@test.local', password: PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@test.local', password: 'ResetPass123!' });
    expect(newLogin.status).toBe(200);
  });

  it('verifies a token against the live account state', async () => {
    const signedIn = await login(app, 'member@test.local');
    const access = cookieFrom(signedIn, 'wt_access');

    const valid = await request(app).get('/api/v1/auth/verify').set('Cookie', access);
    expect(valid.status).toBe(200);
    expect(valid.body.data.valid).toBe(true);

    const deactivated = await adminAgent
      .patch(`/api/v1/users/${member.id}/status`)
      .send({ isActive: false });
    expect(deactivated.status).toBe(200);

    const afterDeactivation = await request(app)
      .get('/api/v1/auth/verify')
      .set('Cookie', access);
    expect(afterDeactivation.status).toBe(401);
  });

  it('lets any project member change status while keeping other task edits manager-only', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);

    await createUser({ fullName: 'Outside User', email: 'outsider@test.local' });
    const outsiderAgent = await loginAgent(app, 'outsider@test.local');

    const task = await createTask(managerAgent, projectId, { assigneeId: member.id });
    const taskId = task.body.data.id;

    const hidden = await outsiderAgent.get(`/api/v1/tasks/${taskId}`);
    expect(hidden.status).toBe(403);

    const status = await memberAgent
      .patch(`/api/v1/tasks/${taskId}/status`)
      .send({ status: 'IN_REVIEW' });
    expect(status.status).toBe(200);
    expect(status.body.data.status).toBe('IN_REVIEW');

    const forbiddenEdit = await memberAgent
      .patch(`/api/v1/tasks/${taskId}`)
      .send({ priority: 'LOW' });
    expect(forbiddenEdit.status).toBe(403);

    const managerEdit = await managerAgent
      .patch(`/api/v1/tasks/${taskId}`)
      .send({ priority: 'URGENT' });
    expect(managerEdit.status).toBe(200);
    expect(managerEdit.body.data.priority).toBe('URGENT');
  });

  it('guards user administration and validates avatar URLs', async () => {
    const lastAdmin = await adminAgent
      .patch(`/api/v1/users/${admin.id}/role`)
      .send({ role: 'TEAM_MEMBER' });
    expect(lastAdmin.status).toBe(409);

    const selfDeactivate = await adminAgent
      .patch(`/api/v1/users/${admin.id}/status`)
      .send({ isActive: false });
    expect(selfDeactivate.status).toBe(400);

    const foreignProfile = await memberAgent.get(`/api/v1/users/${admin.id}`);
    expect(foreignProfile.status).toBe(403);
    const ownProfile = await memberAgent.get(`/api/v1/users/${member.id}`);
    expect(ownProfile.status).toBe(200);

    const unsafeAvatar = await memberAgent
      .patch('/api/v1/users/me')
      .send({ avatarUrl: 'javascript:alert(1)' });
    expect(unsafeAvatar.status).toBe(400);

    const safeAvatar = await memberAgent
      .patch('/api/v1/users/me')
      .send({ avatarUrl: 'https://example.test/avatar.png' });
    expect(safeAvatar.status).toBe(200);
    expect(safeAvatar.body.data.avatarUrl).toBe('https://example.test/avatar.png');
  });

  it('rejects foreign origins, treats search input as data, and does not reflect URLs', async () => {
    const csrf = await memberAgent
      .post('/api/v1/tasks/1/status')
      .set('Origin', 'https://evil.example')
      .send({ status: 'DONE' });
    expect(csrf.status).toBe(403);
    expect(csrf.body.error.code).toBe('FORBIDDEN');

    const injection = await memberAgent.get("/api/v1/tasks?search=' OR 1=1 --");
    expect(injection.status).toBe(200);
    expect(injection.body.data).toHaveLength(0);

    const notFound = await request(app).get('/api/v1/nope?token=super-secret');
    expect(notFound.status).toBe(404);
    expect(JSON.stringify(notFound.body)).not.toContain('super-secret');
  });

  it('enforces the login rate limit even when X-Forwarded-For is spoofed', async () => {
    const limitedApp = buildApp({ rateLimiting: true });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(limitedApp)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `203.0.113.${attempt + 1}`)
        .send({ email: 'member@test.local', password: 'WrongPassword1!' });
      expect(response.status).toBe(401);
    }

    const blocked = await request(limitedApp)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ email: 'member@test.local', password: PASSWORD });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS');
  });

  it('soft-deletes tasks while preserving comments and activity history', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);
    const task = await createTask(managerAgent, projectId, { assigneeId: member.id });
    const taskId = task.body.data.id;

    const comment = await memberAgent
      .post(`/api/v1/tasks/${taskId}/comments`)
      .send({ content: 'Keep this history.' });
    expect(comment.status).toBe(201);

    const deleted = await managerAgent.delete(`/api/v1/tasks/${taskId}`);
    expect(deleted.status).toBe(200);

    const detail = await managerAgent.get(`/api/v1/tasks/${taskId}`);
    expect(detail.status).toBe(404);
    const list = await managerAgent.get('/api/v1/tasks');
    expect(list.body.data).toHaveLength(0);
    const projectDetail = await managerAgent.get(`/api/v1/projects/${projectId}`);
    expect(projectDetail.body.data.taskCount).toBe(0);

    const stored = await execute('SELECT deleted_at FROM tasks WHERE id = ?', [taskId]);
    expect(stored[0].deleted_at).toBeTruthy();
    const storedComments = await execute(
      'SELECT COUNT(*) AS total FROM comments WHERE task_id = ?',
      [taskId],
    );
    expect(Number(storedComments[0].total)).toBe(1);
    const storedActivity = await execute(
      "SELECT COUNT(*) AS total FROM activity_logs WHERE task_id = ? AND action = 'TASK_CREATED'",
      [taskId],
    );
    expect(Number(storedActivity[0].total)).toBe(1);
  });

  it('filters status notifications by preference and deduplicates deadline alerts', async () => {
    const project = await createProject(managerAgent);
    const projectId = project.body.data.id;
    await addMember(managerAgent, projectId, member.id);

    await memberAgent
      .patch('/api/v1/users/me/preferences')
      .send({ notificationPrefs: { statusChange: false, dueSoon: false } });

    const muted = await createTask(managerAgent, projectId, {
      assigneeId: member.id,
      dueDate: '2026-11-20T12:00:00.000Z',
    });
    await memberAgent
      .patch(`/api/v1/tasks/${muted.body.data.id}/status`)
      .send({ status: 'IN_PROGRESS' });
    const mutedList = await memberAgent.get('/api/v1/notifications');
    expect(
      mutedList.body.data.some((entry) =>
        ['TASK_STATUS_CHANGED', 'TASK_DUE_SOON'].includes(entry.type),
      ),
    ).toBe(false);

    await memberAgent
      .patch('/api/v1/users/me/preferences')
      .send({ notificationPrefs: { statusChange: true, dueSoon: true } });

    const overdue = await createTask(managerAgent, projectId, {
      title: 'Overdue task',
      assigneeId: member.id,
      dueDate: '2020-01-01T12:00:00.000Z',
    });
    await memberAgent.get('/api/v1/notifications');

    const deadlineRows = await execute(
      'SELECT dedup_key FROM notifications WHERE user_id = ? AND type = ?',
      [member.id, 'TASK_OVERDUE'],
    );
    expect(deadlineRows).toHaveLength(1);
    expect(deadlineRows[0].dedup_key).toMatch(/^task_overdue:/);

    await memberAgent.get('/api/v1/notifications');
    const repeated = await execute(
      'SELECT dedup_key FROM notifications WHERE user_id = ? AND type = ?',
      [member.id, 'TASK_OVERDUE'],
    );
    expect(repeated).toHaveLength(1);

    const completed = await memberAgent
      .patch(`/api/v1/tasks/${overdue.body.data.id}/status`)
      .send({ status: 'DONE' });
    expect(completed.status).toBe(200);

    const managerNotifications = await managerAgent.get('/api/v1/notifications');
    expect(
      managerNotifications.body.data.some(
        (entry) =>
          entry.type === 'TASK_COMPLETED' && entry.payload.taskId === overdue.body.data.id,
      ),
    ).toBe(true);
  });

  it('writes an audit trail for authentication and administrative actions', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@test.local', password: 'WrongPassword1!' });
    await adminAgent
      .patch(`/api/v1/users/${member.id}/role`)
      .send({ role: 'PROJECT_MANAGER' });
    await adminAgent
      .patch(`/api/v1/users/${member.id}/status`)
      .send({ isActive: false });

    const rows = await execute('SELECT action FROM audit_logs ORDER BY id ASC');
    const actions = rows.map((row) => row.action);
    expect(actions).toContain('LOGIN_FAILED');
    expect(actions).toContain('LOGIN_SUCCESS');
    expect(actions).toContain('ROLE_CHANGED');
    expect(actions).toContain('USER_STATUS_CHANGED');
  });
});
