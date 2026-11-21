import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FolderKanban } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { projectsApi, reportsApi, tasksApi } from '../../services/watchtowerApi.js';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';
import { PriorityLabel, ProjectStatusLabel, TaskStatusLabel } from '../../components/ui/SemanticLabels.jsx';

export function DashboardPage() {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);

  const fetchAll = useCallback(async () => {
    const [projRes, taskRes, actRes, summaryRes] = await Promise.all([
      projectsApi.list(),
      tasksApi.listAll(),
      reportsApi.recentActivity(),
      reportsApi.summary(),
    ]);
    return {
      projects: projRes?.data || [],
      tasks: taskRes?.data || [],
      activities: actRes?.data || [],
      summary: summaryRes?.data || null,
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchAll()
      .then((data) => {
        if (!active) return;
        setProjects(data.projects);
        setTasks(data.tasks);
        setActivities(data.activities);
        setSummary(data.summary);
        setError('');
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
  }, [fetchAll, t]);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAll();
      setProjects(data.projects);
      setTasks(data.tasks);
      setActivities(data.activities);
      setSummary(data.summary);
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={6} />;
  }

  const myTasks = tasks.filter((task) => task.assigneeId === user?.id && task.status !== 'DONE');
  // KPIs come from the server-side summary so they stay accurate even if the
  // detailed lists are capped; fall back to the loaded rows if unavailable.
  const completedCount = summary?.completedTasks ?? tasks.filter((task) => task.status === 'DONE').length;
  const activeCount = summary?.pendingTasks ?? tasks.filter((task) => task.status !== 'DONE').length;
  const overdueCount = summary?.overdueTasks ?? tasks.filter((task) => task.isOverdue).length;
  const projectCount = summary?.totalProjects ?? projects.length;

  const upcomingDeadlines = [...tasks]
    .filter((task) => task.dueDate && task.status !== 'DONE')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  const recentProjects = projects.slice(0, 4);
  const recentActivity = activities.slice(0, 6);

  const kpis = [
    { label: t('dashboard.kpiProjects'), value: projectCount, icon: FolderKanban, color: 'text-[#6366F1] dark:text-[#818CF8]' },
    { label: t('dashboard.kpiActiveTasks'), value: activeCount, icon: Clock, color: 'text-[#2563EB] dark:text-[#60A5FA]' },
    { label: t('dashboard.kpiCompletedTasks'), value: completedCount, icon: CheckCircle2, color: 'text-[#16A34A] dark:text-[#4ADE80]' },
    { label: t('dashboard.kpiOverdue'), value: overdueCount, icon: AlertCircle, color: 'text-[#DC2626] dark:text-[#F87171]' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.welcome', { name: user?.fullName || '' })}
        </h2>
        <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.subtitle')}</p>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {/* KPI Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">{kpi.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
              </div>
              <Icon className={`w-5 h-5 shrink-0 ${kpi.color}`} aria-hidden="true" />
            </div>
          );
        })}
      </section>

      {/* Main 2x2 Productivity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449] flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('dashboard.myTasks')}</h3>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline"
            >
              <span>{t('dashboard.viewAllTasks')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="p-5 text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.noTasks')}</p>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {myTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] truncate">
                      {task.projectName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <PriorityLabel priority={task.priority} />
                    <TaskStatusLabel status={task.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming Deadlines */}
        <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449] flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('dashboard.upcomingDeadlines')}</h3>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline"
            >
              <span>{t('nav.calendar')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="p-5 text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.noDeadlines')}</p>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {upcomingDeadlines.map((task) => (
                <li key={task.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] truncate">
                      {task.projectName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        task.isOverdue ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#64748B] dark:text-[#9CA3AF]'
                      }`}
                    >
                      {formatDate(task.dueDate, { dateStyle: 'medium' })}
                    </p>
                    {task.isOverdue && (
                      <p className="text-[11px] font-medium text-[#DC2626] dark:text-[#F87171]">
                        {t('common.overdue')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Projects */}
        <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449] flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('dashboard.recentProjects')}</h3>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline"
            >
              <span>{t('dashboard.viewAllProjects')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <p className="p-5 text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.noProjects')}</p>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {recentProjects.map((project) => (
                <li key={project.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-sm font-medium hover:text-[#6366F1] dark:hover:text-[#818CF8] truncate block"
                    >
                      {project.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B] dark:text-[#9CA3AF]">
                      <span>{project.ownerName}</span>
                      <span aria-hidden="true">·</span>
                      <ProjectStatusLabel status={project.status} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums shrink-0">
                    {project.progress}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Activity */}
        <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449]">
            <h3 className="text-sm font-semibold">{t('dashboard.recentActivity')}</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="p-5 text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#9CA3AF]">
                      {entry.actorName}
                    </p>
                  </div>
                  <span className="text-xs text-[#64748B] dark:text-[#9CA3AF] shrink-0 tabular-nums">
                    {formatDate(entry.createdAt, { dateStyle: 'short' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
