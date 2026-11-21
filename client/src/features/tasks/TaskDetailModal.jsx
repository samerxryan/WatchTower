import { useCallback, useEffect, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { projectsApi, tasksApi } from '../../services/watchtowerApi.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PriorityLabel, TaskStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { Avatar, ErrorBanner } from '../../components/ui/DataState.jsx';

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function TaskDetailContent({ task, onClose, onUpdated }) {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'TODO',
    priority: task.priority || 'MEDIUM',
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  // Mirror the backend rule: admins, the project owner and project-level
  // managers may edit full task fields. Plain members can only move status.
  const canManageTask =
    user?.role === 'ADMIN' ||
    Number(project?.ownerId) === Number(user?.id) ||
    members.some(
      (m) => Number(m.userId) === Number(user?.id) && m.projectRole === 'MANAGER',
    );

  const fetchExtras = useCallback(async () => {
    const [projRes, commRes] = await Promise.all([
      projectsApi.get(task.projectId),
      tasksApi.listComments(task.id),
    ]);
    return {
      project: projRes?.data || null,
      members: projRes?.data?.members || [],
      comments: commRes?.data || [],
    };
  }, [task.id, task.projectId]);

  useEffect(() => {
    let active = true;
    fetchExtras()
      .then((res) => {
        if (!active) return;
        setProject(res.project);
        setMembers(res.members);
        setComments(res.comments);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchExtras]);

  const reloadExtras = async () => {
    const res = await fetchExtras();
    setProject(res.project);
    setMembers(res.members);
    setComments(res.comments);
  };

  const handleStatusChange = async (nextStatus) => {
    setError('');
    try {
      await tasksApi.updateStatus(task.id, nextStatus);
      await onUpdated();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await tasksApi.update(task.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate ? `${form.dueDate}T14:00:00.000Z` : null,
      });
      setEditing(false);
      await onUpdated();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    setError('');
    try {
      await tasksApi.remove(task.id);
      onClose();
      await onUpdated();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    setError('');
    try {
      await tasksApi.addComment(task.id, commentText.trim());
      setCommentText('');
      await reloadExtras();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await tasksApi.deleteComment(commentId);
      await reloadExtras();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      {!editing ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <TaskStatusLabel status={task.status} />
              <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
              <PriorityLabel priority={task.priority} />
              {task.isOverdue && (
                <>
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span className="text-xs font-medium text-[#DC2626] dark:text-[#F87171]">
                    {t('common.overdue')}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label={t('tasks.moveStatus')}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`taskStatuses.${s}`)}
                  </option>
                ))}
              </select>

              {canManageTask && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} aria-label={t('common.delete')}>
                    <Trash2 className="w-4 h-4 text-[#DC2626]" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {confirmDelete && (
            <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 flex items-center justify-between gap-3">
              <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
                {t('tasks.deleteConfirm', { title: task.title })}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteTask}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          )}

          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] leading-relaxed">
            {task.description || '—'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E2E8F0] dark:border-[#273449] text-xs">
            <div>
              <span className="text-[#64748B] dark:text-[#9CA3AF] block">{t('tasks.project')}</span>
              <span className="font-medium mt-0.5 block">{task.projectName}</span>
            </div>
            <div>
              <span className="text-[#64748B] dark:text-[#9CA3AF] block">{t('common.assignee')}</span>
              <span className="font-medium mt-0.5 block">{task.assigneeName || t('common.unassigned')}</span>
            </div>
            <div>
              <span className="text-[#64748B] dark:text-[#9CA3AF] block">{t('common.dueDate')}</span>
              <span className="font-medium mt-0.5 block tabular-nums">
                {task.dueDate ? formatDate(task.dueDate, { dateStyle: 'medium' }) : '—'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="task-edit-title" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('tasks.taskTitle')}
            </label>
            <input
              id="task-edit-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-edit-description" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('common.description')}
            </label>
            <textarea
              id="task-edit-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="task-edit-priority" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.priority')}
              </label>
              <select
                id="task-edit-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-edit-assignee" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.assignee')}
              </label>
              <select
                id="task-edit-assignee"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                <option value="">{t('common.unassigned')}</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-edit-due-date" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('common.dueDate')}
            </label>
            <input
              id="task-edit-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      )}

      {/* Comments Thread */}
      <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#273449] space-y-4">
        <h3 className="text-sm font-semibold">{t('tasks.comments')}</h3>

        <div className="space-y-3 max-h-56 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 text-sm">
              <Avatar name={c.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs">{c.authorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#64748B] dark:text-[#9CA3AF] tabular-nums">
                      {formatDate(c.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {(c.authorId === user?.id || user?.role === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        aria-label={t('common.delete')}
                        className="text-[#64748B] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-[#111827] dark:text-[#F8FAFC]">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="flex items-center gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={t('tasks.addComment')}
            aria-label={t('tasks.addComment')}
            className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
          />
          <Button type="submit" size="md" loading={posting} disabled={!commentText.trim()}>
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('tasks.sendComment')}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

export function TaskDetailModal({ task, open, onClose, onUpdated }) {
  return (
    <Modal open={open && Boolean(task)} onClose={onClose} title={task?.title || ''} maxWidth="max-w-2xl">
      {open && task && (
        <TaskDetailContent key={task.id} task={task} onClose={onClose} onUpdated={onUpdated} />
      )}
    </Modal>
  );
}
