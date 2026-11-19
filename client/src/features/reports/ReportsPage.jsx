import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { reportsApi } from '../../services/watchtowerApi.js';
import { ProjectStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';

export function ReportsPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    const res = await reportsApi.summary();
    return res?.data || null;
  }, []);

  useEffect(() => {
    let active = true;
    fetchSummary()
      .then((data) => {
        if (!active) return;
        setSummary(data);
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
  }, [fetchSummary, t]);

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t('reports.title')}</h2>
        <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('reports.subtitle')}</p>
      </div>

      <ErrorBanner message={error} />

      {summary && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.kpiProjects')}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.totalProjects}</p>
            </div>
            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF]">{t('reports.completed')}</p>
              <p className="mt-1 text-2xl font-semibold text-[#16A34A] dark:text-[#4ADE80] tabular-nums">
                {summary.completedTasks}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF]">{t('reports.pending')}</p>
              <p className="mt-1 text-2xl font-semibold text-[#D97706] dark:text-[#FBBF24] tabular-nums">
                {summary.pendingTasks}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF]">{t('reports.overallProgress')}</p>
              <p className="mt-1 text-2xl font-semibold text-[#6366F1] dark:text-[#818CF8] tabular-nums">
                {summary.overallProgress}%
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] space-y-4">
              <h3 className="text-sm font-semibold">{t('reports.byStatus')}</h3>
              {Object.entries(summary.tasksByStatus || {}).map(([status, count]) => {
                const pct = summary.totalTasks ? Math.round((count / summary.totalTasks) * 100) : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{t(`taskStatuses.${status}`)}</span>
                      <span className="tabular-nums font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F5F9] dark:bg-[#1F2937] overflow-hidden">
                      <div className="h-full bg-[#6366F1] dark:bg-[#818CF8]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] space-y-4">
              <h3 className="text-sm font-semibold">{t('reports.byPriority')}</h3>
              {Object.entries(summary.tasksByPriority || {}).map(([prio, count]) => {
                const pct = summary.totalTasks ? Math.round((count / summary.totalTasks) * 100) : 0;
                return (
                  <div key={prio} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{t(`priorities.${prio}`)}</span>
                      <span className="tabular-nums font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F5F9] dark:bg-[#1F2937] overflow-hidden">
                      <div className="h-full bg-[#2563EB] dark:bg-[#60A5FA]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449]">
              <h3 className="text-sm font-semibold">{t('reports.projectBreakdown')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#273449] text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                    <th className="py-3 px-4">{t('projects.name')}</th>
                    <th className="py-3 px-4">{t('common.status')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.completed')}</th>
                    <th className="py-3 px-4 text-right">{t('common.progress')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#273449] text-sm">
                  {(summary.projects || []).map((proj) => (
                    <tr key={proj.id}>
                      <td className="py-3 px-4 font-medium">{proj.name}</td>
                      <td className="py-3 px-4"><ProjectStatusLabel status={proj.status} /></td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {proj.completedTaskCount} / {proj.taskCount}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">{proj.progress}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
