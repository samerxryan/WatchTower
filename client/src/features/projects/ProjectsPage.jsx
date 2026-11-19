import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, FolderKanban, Pencil, Plus, Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { projectsApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ProjectStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { EmptyState, ErrorBanner, LoadingSkeleton, Pagination } from '../../components/ui/DataState.jsx';

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];

export function ProjectsPage() {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', startDate: '', dueDate: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const fetchProjects = useCallback(async () => {
    const res = await projectsApi.list();
    return res?.data || [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((rows) => {
        if (active) {
          setProjects(rows);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || t('common.errorTitle'));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [fetchProjects, t]);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await fetchProjects());
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'PLANNING', startDate: '', dueDate: '' });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'PLANNING',
      startDate: project.startDate ? String(project.startDate).slice(0, 10) : '',
      dueDate: project.dueDate ? String(project.dueDate).slice(0, 10) : '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return;
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      setFormError(t('projects.invalidDates'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
      };
      if (editing) {
        await projectsApi.update(editing.id, payload);
      } else {
        await projectsApi.create(payload);
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(err?.message || t('common.errorTitle'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await projectsApi.archive(archiveTarget.id);
      setArchiveTarget(null);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setArchiving(false);
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.ownerName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{t('projects.title')}</h2>
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('projects.subtitle')}</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t('projects.newProject')}</span>
          </Button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827] focus:outline-2 focus:outline-[#6366F1]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('common.status')}
          className="px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827] focus:outline-2 focus:outline-[#6366F1]"
        >
          <option value="ALL">{t('common.all')}</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`projectStatuses.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t('projects.emptyTitle')}
          description={t('projects.emptyBody')}
          action={
            canCreate && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{t('projects.newProject')}</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#273449] text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                  <th className="py-3 px-4">{t('projects.name')}</th>
                  <th className="py-3 px-4">{t('projects.manager')}</th>
                  <th className="py-3 px-4">{t('common.status')}</th>
                  <th className="py-3 px-4">{t('common.progress')}</th>
                  <th className="py-3 px-4">{t('common.dueDate')}</th>
                  <th className="py-3 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#273449] text-sm">
                {visibleRows.map((project) => {
                  const canManageRow =
                    user?.role === 'ADMIN' ||
                    (user?.role === 'PROJECT_MANAGER' && project.ownerId === user.id);
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <Link
                          to={`/projects/${project.id}`}
                          className="hover:text-[#6366F1] dark:hover:text-[#818CF8]"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] dark:text-[#9CA3AF]">
                        {project.ownerName}
                      </td>
                      <td className="py-3.5 px-4">
                        <ProjectStatusLabel status={project.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-[120px]">
                          <div className="flex-1 h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#273449] overflow-hidden">
                            <div
                              className="h-full bg-[#6366F1] dark:bg-[#818CF8]"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums w-9 text-right">
                            {project.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64748B] dark:text-[#9CA3AF] tabular-nums whitespace-nowrap">
                        {project.dueDate ? formatDate(project.dueDate, { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canManageRow && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(project)}
                                aria-label={t('common.edit')}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {project.status !== 'ARCHIVED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setArchiveTarget(project)}
                                  aria-label={t('common.archive')}
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('projects.editProject') : t('projects.newProject')}
      >
        <form id="project-form" onSubmit={handleSave} className="space-y-4">
          <ErrorBanner message={formError} />
          <div className="space-y-1.5">
            <label htmlFor="proj-name" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('projects.name')}
            </label>
            <input
              id="proj-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="proj-desc" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('common.description')}
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="proj-status" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.status')}
              </label>
              <select
                id="proj-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`projectStatuses.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proj-start" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.startDate')}
              </label>
              <input
                id="proj-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proj-due" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('common.dueDate')}
              </label>
              <input
                id="proj-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setFormOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="project-form" loading={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={t('projects.archiveProject')}
        maxWidth="max-w-md"
      >
        <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">
          {t('projects.archiveConfirm', { name: archiveTarget?.name || '' })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setArchiveTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" loading={archiving} onClick={handleArchive}>
            {t('common.archive')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
