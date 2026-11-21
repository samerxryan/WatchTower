import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { insightsApi, projectsApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameLocalDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function CalendarPage() {
  const { language, t } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  const [view, setView] = useState('month');
  const [cursorDate, setCursorDate] = useState(() => startOfDay(new Date()));
  const [projects, setProjects] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCalendarData = useCallback(async () => {
    const [projRes, eventsRes] = await Promise.all([
      projectsApi.list(),
      insightsApi.calendarEvents(),
    ]);
    return {
      projects: projRes?.data || [],
      events: eventsRes?.data || [],
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchCalendarData()
      .then((res) => {
        if (!active) return;
        setProjects(res.projects);
        setCalendarEvents(res.events);
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
  }, [fetchCalendarData, t]);

  // Events come from the dedicated server endpoint, which reads all accessible
  // tasks/projects rather than the 20-row default of a list call.
  const events = calendarEvents
    .filter((item) => projectFilter === 'ALL' || String(item.projectId) === String(projectFilter))
    .map((item) => {
      const isProject = item.type === 'PROJECT_DUE';
      const taskDate = new Date(item.dateTime || item.date);
      return {
        id: item.id,
        title: item.title,
        kind: isProject ? 'project' : 'task',
        date: isProject ? new Date(`${String(item.date).slice(0, 10)}T12:00:00`) : taskDate,
        isOverdue: !isProject && item.status !== 'DONE' && taskDate < new Date(),
        sublabel: isProject ? t('calendar.projectDue') : item.projectName,
      };
    });

  const shiftCursor = (dir) => {
    const d = new Date(cursorDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursorDate(startOfDay(d));
  };

  const getMonthGridDays = () => {
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekday);
    return Array.from({ length: 42 }, (_, idx) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + idx);
      return d;
    });
  };

  const getWeekDays = () => {
    const weekday = (cursorDate.getDay() + 6) % 7;
    const monday = new Date(cursorDate);
    monday.setDate(cursorDate.getDate() - weekday);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return d;
    });
  };

  const headerLabel = new Intl.DateTimeFormat(
    locale,
    view === 'month' ? { month: 'long', year: 'numeric' } : { dateStyle: 'long' },
  ).format(cursorDate);

  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{t('calendar.title')}</h2>
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('calendar.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label={t('tasks.project')}
            className="px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827]"
          >
            <option value="ALL">{t('tasks.allProjects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="inline-flex rounded-lg p-1 bg-[#F1F5F9] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#273449]">
            {['month', 'week', 'day'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  view === mode
                    ? 'bg-[#FFFFFF] dark:bg-[#111827] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                    : 'text-[#64748B] dark:text-[#9CA3AF]'
                }`}
              >
                {t(`calendar.${mode}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Navigation Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftCursor(-1)} aria-label={t('common.previous')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCursorDate(startOfDay(new Date()))}>
            {t('common.today')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shiftCursor(1)} aria-label={t('common.next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <h3 className="text-sm sm:text-base font-semibold capitalize">{headerLabel}</h3>

        <div className="hidden sm:flex items-center gap-4 text-xs text-[#64748B] dark:text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#6366F1]" aria-hidden="true" />
            {t('calendar.taskDue')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" aria-hidden="true" />
            {t('calendar.projectDue')}
          </span>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : view === 'month' ? (
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#E2E8F0] dark:border-[#273449]">
            {getWeekDays().map((day) => (
              <div key={day.toISOString()} className="py-2.5 px-2 text-center text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-[#E2E8F0] dark:divide-[#273449]">
            {getMonthGridDays().map((day) => {
              const inMonth = day.getMonth() === cursorDate.getMonth();
              const isToday = sameLocalDay(day, today);
              const dayEvents = events.filter((ev) => sameLocalDay(ev.date, day));
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[96px] p-2 space-y-1.5 ${
                    !inMonth ? 'bg-[#F8FAFC]/60 dark:bg-[#0B1120]/40 text-[#9CA3AF]' : ''
                  }`}
                >
                  <div className="flex justify-end">
                    <span
                      className={`w-6 h-6 text-xs font-medium rounded-full inline-flex items-center justify-center tabular-nums ${
                        isToday ? 'bg-[#6366F1] text-white dark:bg-[#818CF8] dark:text-[#0B1120]' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        title={`${ev.title} (${ev.sublabel})`}
                        className={`px-1.5 py-0.5 text-[11px] rounded truncate ${
                          ev.kind === 'project'
                            ? 'bg-[#16A34A]/15 text-[#16A34A] dark:text-[#4ADE80]'
                            : ev.isOverdue
                              ? 'bg-[#DC2626]/15 text-[#DC2626] dark:text-[#F87171]'
                              : 'bg-[#6366F1]/15 text-[#4338CA] dark:text-[#A5B4FC]'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {getWeekDays().map((day) => {
            const dayEvents = events.filter((ev) => sameLocalDay(ev.date, day));
            const isToday = sameLocalDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border ${
                  isToday ? 'border-[#6366F1] dark:border-[#818CF8]' : 'border-[#E2E8F0] dark:border-[#273449]'
                } space-y-2 min-h-[180px]`}
              >
                <p className="text-xs font-semibold capitalize">
                  {new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(day)}
                </p>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className={`p-2 rounded-lg text-xs ${
                          ev.kind === 'project'
                            ? 'bg-[#16A34A]/10 text-[#16A34A] dark:text-[#4ADE80]'
                            : 'bg-[#6366F1]/10 text-[#4338CA] dark:text-[#A5B4FC]'
                        }`}
                      >
                        <p className="font-medium truncate">{ev.title}</p>
                        <p className="text-[11px] opacity-80 truncate">{ev.sublabel}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] space-y-4">
          <h4 className="text-sm font-semibold capitalize">
            {new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(cursorDate)}
          </h4>
          {(() => {
            const dayEvents = events.filter((ev) => sameLocalDay(ev.date, cursorDate));
            if (dayEvents.length === 0) {
              return <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('calendar.noEvents')}</p>;
            }
            return (
              <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
                {dayEvents.map((ev) => (
                  <li key={ev.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{ev.title}</p>
                      <p className="text-xs text-[#64748B] dark:text-[#9CA3AF]">{ev.sublabel}</p>
                    </div>
                    <span className="text-xs font-medium text-[#6366F1] dark:text-[#818CF8]">
                      {ev.kind === 'project' ? t('calendar.projectDue') : t('calendar.taskDue')}
                    </span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}
    </div>
  );
}
