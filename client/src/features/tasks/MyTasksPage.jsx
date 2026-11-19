import { useCallback, useEffect, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { tasksApi } from '../../services/watchtowerApi.js';
import { PriorityLabel, TaskStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';
import { TaskDetailModal } from './TaskDetailModal.jsx';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export function MyTasksPage() {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    const res = await tasksApi.listAll();
    const all = res?.data || [];
    return all.filter((item) => item.assigneeId === user?.id);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    fetchTasks()
      .then((rows) => {
        if (!active) return;
        setTasks(rows);
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
  }, [fetchTasks, t]);

  const reload = async () => {
    try {
      const rows = await fetchTasks();
      setTasks(rows);
      if (selectedTask) {
        setSelectedTask(rows.find((item) => item.id === selectedTask.id) || null);
      }
      setError('');
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleStatusChange = async (taskId, nextStatus) => {
    try {
      await tasksApi.updateStatus(taskId, nextStatus);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const visible = tasks.filter((item) => statusFilter === 'ALL' || item.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{t('tasks.title')}</h2>
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('tasks.subtitle')}</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('common.status')}
          className="px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827] self-start sm:self-auto"
        >
          <option value="ALL">{t('common.all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`taskStatuses.${s}`)}</option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState icon={CheckSquare} title={t('tasks.emptyMyTasks')} />
      ) : (
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#273449] text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                  <th className="py-3 px-4">{t('tasks.taskTitle')}</th>
                  <th className="py-3 px-4">{t('tasks.project')}</th>
                  <th className="py-3 px-4">{t('common.priority')}</th>
                  <th className="py-3 px-4">{t('common.status')}</th>
                  <th className="py-3 px-4">{t('common.dueDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#273449] text-sm">
                {visible.map((task) => (
                  <tr key={task.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                    <td className="py-3.5 px-4 font-medium">
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="text-left hover:text-[#6366F1] dark:hover:text-[#818CF8]"
                      >
                        {task.title}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] dark:text-[#9CA3AF]">{task.projectName}</td>
                    <td className="py-3.5 px-4"><PriorityLabel priority={task.priority} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <TaskStatusLabel status={task.status} />
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          aria-label={t('tasks.moveStatus')}
                          className="px-2 py-1 text-xs rounded-md border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{t(`taskStatuses.${s}`)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs tabular-nums">
                      {task.dueDate ? (
                        <span className={task.isOverdue ? 'text-[#DC2626] dark:text-[#F87171] font-medium' : 'text-[#64748B] dark:text-[#9CA3AF]'}>
                          {formatDate(task.dueDate, { dateStyle: 'medium' })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TaskDetailModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdated={reload}
      />
    </div>
  );
}
