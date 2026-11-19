import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GanttChartSquare } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { projectsApi } from '../../services/watchtowerApi.js';
import { ProjectStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';

export function TimelinePage() {
  const { t, formatDate } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = useCallback(async () => {
    const res = await projectsApi.list();
    return res?.data || [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((rows) => {
        if (!active) return;
        setProjects(rows);
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
  }, [fetchProjects, t]);

  const datedProjects = projects.filter((p) => p.startDate && p.dueDate);
  const timestamps = datedProjects.flatMap((p) => [
    new Date(p.startDate).getTime(),
    new Date(p.dueDate).getTime(),
  ]);
  const minTime = timestamps.length ? Math.min(...timestamps) : 0;
  const maxTime = timestamps.length ? Math.max(...timestamps) : 86400000;
  const span = Math.max(1, maxTime - minTime);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t('timeline.title')}</h2>
        <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('timeline.subtitle')}</p>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : datedProjects.length === 0 ? (
        <EmptyState icon={GanttChartSquare} title={t('timeline.empty')} />
      ) : (
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-[#273449] flex items-center justify-between text-xs text-[#64748B] dark:text-[#9CA3AF] tabular-nums">
            <span>{formatDate(minTime, { dateStyle: 'medium' })}</span>
            <span>{formatDate(maxTime, { dateStyle: 'medium' })}</span>
          </div>

          <div className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
            {projects.map((project) => {
              const hasDates = Boolean(project.startDate && project.dueDate);
              const startMs = hasDates ? new Date(project.startDate).getTime() : minTime;
              const endMs = hasDates ? new Date(project.dueDate).getTime() : minTime;
              const leftPct = ((startMs - minTime) / span) * 100;
              const widthPct = Math.max(4, ((endMs - startMs) / span) * 100);

              return (
                <div key={project.id} className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-4 space-y-1 min-w-0">
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-sm font-medium hover:text-[#6366F1] dark:hover:text-[#818CF8] truncate block"
                    >
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#9CA3AF]">
                      <ProjectStatusLabel status={project.status} />
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{project.progress}%</span>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-1.5">
                    {hasDates ? (
                      <>
                        <div className="relative h-6 rounded-md bg-[#F1F5F9] dark:bg-[#1F2937] overflow-hidden">
                          <div
                            className="absolute top-1 bottom-1 rounded bg-[#6366F1]/25 dark:bg-[#818CF8]/25 border border-[#6366F1] dark:border-[#818CF8]"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          >
                            <div
                              className="h-full bg-[#6366F1] dark:bg-[#818CF8]"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#64748B] dark:text-[#9CA3AF] tabular-nums">
                          <span>{formatDate(project.startDate, { dateStyle: 'medium' })}</span>
                          <span>{formatDate(project.dueDate, { dateStyle: 'medium' })}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#9CA3AF]">{t('timeline.noDates')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
