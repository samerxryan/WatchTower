import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usersApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar, ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';

const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'];

export function TeamPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    const res = await usersApi.list();
    return res?.data || [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then((rows) => {
        if (!active) return;
        setUsers(rows);
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
  }, [fetchUsers, t]);

  const reload = async () => {
    try {
      setUsers(await fetchUsers());
      setError('');
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await usersApi.updateRole(userId, role);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleToggleStatus = async (target) => {
    try {
      await usersApi.updateStatus(target.id, !target.isActive);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t('team.title')}</h2>
        <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('team.subtitle')}</p>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#273449] text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                  <th className="py-3 px-4">{t('team.user')}</th>
                  <th className="py-3 px-4">{t('team.email')}</th>
                  <th className="py-3 px-4">{t('team.role')}</th>
                  <th className="py-3 px-4">{t('team.accountStatus')}</th>
                  {isAdmin && <th className="py-3 px-4 text-right">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#273449] text-sm">
                {users.map((row) => {
                  const isSelf = row.id === user?.id;
                  return (
                    <tr key={row.id}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={row.fullName} size="sm" />
                          <span className="font-medium">{row.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] dark:text-[#9CA3AF]">{row.email}</td>
                      <td className="py-3.5 px-4">
                        {isAdmin && !isSelf ? (
                          <select
                            value={row.role}
                            onChange={(e) => handleRoleChange(row.id, e.target.value)}
                            aria-label={`${t('team.role')}: ${row.fullName}`}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{t(`roles.${r}`)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium">{t(`roles.${row.role}`)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-medium ${
                            row.isActive
                              ? 'text-[#16A34A] dark:text-[#4ADE80]'
                              : 'text-[#DC2626] dark:text-[#F87171]'
                          }`}
                        >
                          {row.isActive ? t('team.active') : t('team.inactive')}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-[#9CA3AF]">{t('team.cannotChangeSelf')}</span>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? t('team.deactivate') : t('team.activate')}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
