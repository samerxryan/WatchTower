import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Kanban, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { projectsApi, usersApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { ProjectStatusLabel } from '../../components/ui/SemanticLabels.jsx';
import { Avatar, ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { t, formatDate } = useI18n();

  const [project, setProject] = useState(null);
  const [activity, setActivity] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [adding, setAdding] = useState(false);

  const loadDetail = useCallback(async () => {
    const [projRes, actRes] = await Promise.all([
      projectsApi.get(projectId),
      projectsApi.activity(projectId),
    ]);
    let usersList = [];
    if (user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') {
      try {
        const usersRes = await usersApi.list();
        usersList = usersRes?.data || [];
      } catch {
        usersList = [];
      }
    }
    return {
      project: projRes?.data || null,
      activity: actRes?.data || [],
      users: usersList,
    };
  }, [projectId, user?.role]);

  useEffect(() => {
    let active = true;
    loadDetail()
      .then((res) => {
        if (!active) return;
        setProject(res.project);
        setActivity(res.activity);
        setAllUsers(res.users);
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
  }, [loadDetail, t]);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loadDetail();
      setProject(res.project);
      setActivity(res.activity);
      setAllUsers(res.users);
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setLoading(false);
    }
  };

  const canManage =
    user?.role === 'ADMIN' ||
    (user?.role === 'PROJECT_MANAGER' && project?.ownerId === user?.id);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setAdding(true);
    setError('');
    try {
      await projectsApi.addMember(projectId, {
        userId: Number(selectedUserId),
        projectRole: selectedRole,
      });
      setSelectedUserId('');
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    setError('');
    try {
      await projectsApi.removeMember(projectId, userId);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  if (loading) return <LoadingSkeleton rows={6} />;

  if (!project) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || t('common.errorTitle')} onRetry={reload} />
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-[#6366F1]">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('projects.backToList')}</span>
        </Link>
      </div>
    );
  }

  const memberIds = new Set((project.members || []).map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id) && u.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('projects.backToList')}</span>
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] dark:text-[#9CA3AF]">
            <ProjectStatusLabel status={project.status} />
            <span aria-hidden="true">·</span>
            <span>{project.ownerName}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-medium">{project.progress}%</span>
          </div>
        </div>

        <Link
          to={`/kanban?projectId=${project.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] text-white dark:text-[#0B1120] whitespace-nowrap shrink-0 self-start"
        >
          <Kanban className="w-4 h-4" aria-hidden="true" />
          <span>{t('projects.openKanban')}</span>
        </Link>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {project.description && (
        <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] leading-relaxed">
            {project.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Section */}
        <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449]">
            <h3 className="text-sm font-semibold">{t('projects.members')}</h3>
          </div>

          {canManage && availableUsers.length > 0 && (
            <form
              onSubmit={handleAddMember}
              className="p-4 border-b border-[#E2E8F0] dark:border-[#273449] flex flex-col sm:flex-row gap-2"
            >
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                aria-label={t('projects.selectUser')}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                <option value="">{t('projects.selectUser')}</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                aria-label={t('projects.projectRole')}
                className="px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              >
                <option value="MEMBER">{t('roles.MEMBER')}</option>
                <option value="MANAGER">{t('roles.MANAGER')}</option>
              </select>
              <Button type="submit" size="sm" loading={adding} disabled={!selectedUserId}>
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('projects.addMember')}</span>
              </Button>
            </form>
          )}

          <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
            {(project.members || []).map((member) => (
              <li key={member.userId} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.fullName}</p>
                    <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] truncate">
                      {t(`roles.${member.projectRole}`)}
                    </p>
                  </div>
                </div>
                {canManage && member.userId !== project.ownerId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.userId)}
                    aria-label={t('projects.removeMember')}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Project Activity */}
        <section className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#273449]">
            <h3 className="text-sm font-semibold">{t('projects.activity')}</h3>
          </div>
          {activity.length === 0 ? (
            <p className="p-5 text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {activity.map((entry) => (
                <li key={entry.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#9CA3AF]">
                      {entry.actorName}
                    </p>
                  </div>
                  <span className="text-xs text-[#64748B] dark:text-[#9CA3AF] tabular-nums shrink-0">
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
