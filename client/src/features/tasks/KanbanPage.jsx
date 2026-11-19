import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { projectsApi, tasksApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { PriorityLabel, TaskStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { Avatar, ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';
import { TaskDetailModal } from './TaskDetailModal.jsx';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function KanbanPage() {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dragTaskId, setDragTaskId] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [createForm, setCreateForm] = useState({
    projectId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchBoard = useCallback(async () => {
    const [projRes, taskRes] = await Promise.all([projectsApi.list(), tasksApi.listAll()]);
    return {
      projects: projRes?.data || [],
      tasks: taskRes?.data || [],
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchBoard()
      .then((res) => {
        if (!active) return;
        setProjects(res.projects);
        setTasks(res.tasks);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || t('common.errorTitle'));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchBoard, t]);

  const reload = async () => {
    try {
      const res = await fetchBoard();
      setProjects(res.projects);
      setTasks(res.tasks);
      if (selectedTask) {
        const refreshed = res.tasks.find((item) => item.id === selectedTask.id);
        setSelectedTask(refreshed || null);
      }
      setError('');
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const loadMembersForProject = async (pid) => {
    if (!pid) {
      setProjectMembers([]);
      return;
    }
    try {
      const res = await projectsApi.get(pid);
      setProjectMembers(res?.data?.members || []);
    } catch {
      setProjectMembers([]);
    }
  };

  const openCreateModal = async () => {
    const defaultPid =
      projectFilter !== 'ALL' ? projectFilter : projects[0]?.id ? String(projects[0].id) : '';
    setCreateForm({
      projectId: defaultPid,
      title: '',
      description: '',
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
    });
    setCreateOpen(true);
    await loadMembersForProject(defaultPid);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.projectId || !createForm.title.trim()) return;
    setCreating(true);
    setError('');
    try {
      await tasksApi.create(createForm.projectId, {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priority: createForm.priority,
        assigneeId: createForm.assigneeId ? Number(createForm.assigneeId) : null,
        dueDate: createForm.dueDate ? `${createForm.dueDate}T14:00:00.000Z` : null,
      });
      setCreateOpen(false);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setCreating(false);
    }
  };

  const moveTask = async (taskId, nextStatus) => {
    setError('');
    try {
      await tasksApi.updateStatus(taskId, nextStatus);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchProj = projectFilter === 'ALL' || String(task.projectId) === String(projectFilter);
    const matchPrio = priorityFilter === 'ALL' || task.priority === priorityFilter;
    return matchProj && matchPrio;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{t('tasks.kanbanTitle')}</h2>
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('tasks.subtitle')}</p>
        </div>
        {canCreate && projects.length > 0 && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t('tasks.newTask')}</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={projectFilter}
          onChange={(e) => {
            const val = e.target.value;
            setProjectFilter(val);
            if (val === 'ALL') {
              searchParams.delete('projectId');
            } else {
              searchParams.set('projectId', val);
            }
            setSearchParams(searchParams, { replace: true });
          }}
          aria-label={t('tasks.project')}
          className="px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827]"
        >
          <option value="ALL">{t('tasks.allProjects')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label={t('common.priority')}
          className="px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827]"
        >
          <option value="ALL">{t('tasks.allPriorities')}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(`priorities.${p}`)}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((colStatus) => {
            const colTasks = filteredTasks.filter((item) => item.status === colStatus);
            return (
              <section
                key={colStatus}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragTaskId) {
                    moveTask(dragTaskId, colStatus);
                    setDragTaskId(null);
                  }
                }}
                className="rounded-xl bg-[#F1F5F9]/70 dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] p-3.5 space-y-3 min-h-[320px]"
              >
                <div className="flex items-center justify-between px-1">
                  <TaskStatusLabel status={colStatus} />
                  <span className="text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                {colTasks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#64748B] dark:text-[#9CA3AF]">
                    {t('tasks.emptyColumn')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {colTasks.map((task) => (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={() => setDragTaskId(task.id)}
                        onDragEnd={() => setDragTaskId(null)}
                        className="p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#273449] space-y-3 cursor-grab active:cursor-grabbing"
                      >
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className="text-left text-sm font-medium hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors"
                          >
                            {task.title}
                          </button>
                          <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] truncate">
                            {task.projectName}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <PriorityLabel priority={task.priority} />
                          {task.dueDate && (
                            <span
                              className={`text-xs tabular-nums ${
                                task.isOverdue
                                  ? 'text-[#DC2626] dark:text-[#F87171] font-medium'
                                  : 'text-[#64748B] dark:text-[#9CA3AF]'
                              }`}
                            >
                              {formatDate(task.dueDate, { dateStyle: 'short' })}
                              {task.isOverdue ? ` · ${t('common.overdue')}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#273449] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {task.assigneeName ? (
                              <>
                                <Avatar name={task.assigneeName} size="sm" />
                                <span className="text-xs text-[#64748B] dark:text-[#9CA3AF] truncate">
                                  {task.assigneeName}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-[#9CA3AF]">{t('common.unassigned')}</span>
                            )}
                          </div>

                          <select
                            value={task.status}
                            onChange={(e) => moveTask(task.id, e.target.value)}
                            aria-label={`${t('tasks.moveStatus')}: ${task.title}`}
                            className="px-2 py-1 text-[11px] rounded-md border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#111827]"
                          >
                            {COLUMNS.map((s) => (
                              <option key={s} value={s}>
                                {t(`taskStatuses.${s}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('tasks.newTask')}>
        <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="task-proj" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('tasks.project')}
            </label>
            <select
              id="task-proj"
              required
              value={createForm.projectId}
              onChange={(e) => {
                const pid = e.target.value;
                setCreateForm({ ...createForm, projectId: pid, assigneeId: '' });
                loadMembersForProject(pid);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('tasks.taskTitle')}
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('common.description')}
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="task-prio" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.priority')}
              </label>
              <select
                id="task-prio"
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-due" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.dueDate')}
              </label>
              <input
                id="task-due"
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-assignee" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('common.assignee')}
            </label>
            <select
              id="task-assignee"
              value={createForm.assigneeId}
              onChange={(e) => setCreateForm({ ...createForm, assigneeId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
            >
              <option value="">{t('common.unassigned')}</option>
              {projectMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">{t('tasks.assigneeHint')}</p>
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="create-task-form" loading={creating}>
            {t('common.create')}
          </Button>
        </div>
      </Modal>

      <TaskDetailModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdated={reload}
      />
    </div>
  );
}
