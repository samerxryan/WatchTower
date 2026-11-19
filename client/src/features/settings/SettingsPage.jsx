import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTheme } from '../../styles/ThemeContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usersApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/DataState.jsx';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const [tab, setTab] = useState('profile');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifPrefs, setNotifPrefs] = useState(
    user?.notificationPrefs || { assigned: true, dueSoon: true, statusChange: true },
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await usersApi.updateMe({ fullName: fullName.trim() });
      await refreshUser();
      setSuccess(t('settings.savedSuccess'));
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await usersApi.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('settings.savedSuccess'));
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async (nextLang, nextTheme, nextNotifs = notifPrefs) => {
    setError('');
    setSuccess('');
    setLanguage(nextLang);
    setTheme(nextTheme);
    setNotifPrefs(nextNotifs);
    try {
      await usersApi.updatePreferences({
        preferredLanguage: nextLang,
        preferredTheme: nextTheme,
        notificationPrefs: nextNotifs,
      });
      setSuccess(t('settings.savedSuccess'));
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const tabs = ['profile', 'security', 'preferences', 'privacy'];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h2>
        <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('settings.subtitle')}</p>
      </div>

      <div className="inline-flex flex-wrap rounded-lg p-1 bg-[#F1F5F9] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#273449]">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setError('');
              setSuccess('');
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === key
                ? 'bg-[#FFFFFF] dark:bg-[#111827] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                : 'text-[#64748B] dark:text-[#9CA3AF]'
            }`}
          >
            {t(`settings.tabs.${key}`)}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />
      {success && (
        <p className="text-sm text-[#16A34A] dark:text-[#4ADE80]" role="status">
          {success}
        </p>
      )}

      <div className="p-6 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="set-name" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('auth.fullName')}
              </label>
              <input
                id="set-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <span className="text-[#64748B] dark:text-[#9CA3AF] block">{t('auth.email')}</span>
                <span className="font-medium mt-0.5 block">{user?.email}</span>
              </div>
              <div>
                <span className="text-[#64748B] dark:text-[#9CA3AF] block">{t('team.role')}</span>
                <span className="font-medium mt-0.5 block">{t(`roles.${user?.role}`)}</span>
              </div>
            </div>

            <Button type="submit" loading={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="sec-curr" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('settings.currentPassword')}
              </label>
              <input
                id="sec-curr"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sec-new" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('auth.newPassword')}
              </label>
              <input
                id="sec-new"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sec-conf" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="sec-conf"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120]"
              />
            </div>
            <Button type="submit" loading={saving}>
              {t('auth.updatePassword')}
            </Button>
          </form>
        )}

        {tab === 'preferences' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                  {t('settings.languagePref')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={language === 'fr' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSavePreferences('fr', theme)}
                  >
                    Français
                  </Button>
                  <Button
                    variant={language === 'en' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSavePreferences('en', theme)}
                  >
                    English
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                  {t('settings.themePref')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSavePreferences(language, 'light')}
                  >
                    {t('settings.light')}
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSavePreferences(language, 'dark')}
                  >
                    {t('settings.dark')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#273449] space-y-3">
              <p className="text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
                {t('settings.notifPrefs')}
              </p>
              {[
                { key: 'assigned', label: t('settings.notifyAssigned') },
                { key: 'dueSoon', label: t('settings.notifyDueSoon') },
                { key: 'statusChange', label: t('settings.notifyStatus') },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(notifPrefs[item.key])}
                    onChange={(e) => {
                      const next = { ...notifPrefs, [item.key]: e.target.checked };
                      handleSavePreferences(language, theme, next);
                    }}
                    className="w-4 h-4 accent-[#6366F1] rounded"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'privacy' && (
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] leading-relaxed">
            {t('settings.privacySummary')}
          </p>
        )}
      </div>
    </div>
  );
}
