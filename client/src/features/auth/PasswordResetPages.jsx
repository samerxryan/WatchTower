import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from './LoginPage.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/DataState.jsx';
import { authApi } from '../../services/watchtowerApi.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      <ErrorBanner message={error} />
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-[#16A34A] dark:text-[#4ADE80]">{t('auth.resetSent')}</p>
          <Link to="/reset-password" className="block text-xs font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline">
            {t('auth.resetTitle')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('auth.email')}
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
            />
          </div>
          <Button type="submit" loading={submitting} className="w-full">
            {t('auth.sendResetLink')}
          </Button>
        </form>
      )}
      <p className="text-xs text-center">
        <Link to="/login" className="text-[#64748B] dark:text-[#9CA3AF] hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  // Reset links carry the token in the query string; keep the manual field as
  // a fallback for tokens copied out of an email or API response.
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token: token.trim(), newPassword });
      setDone(true);
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <ErrorBanner message={error} />
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-[#16A34A] dark:text-[#4ADE80]">{t('auth.resetSuccess')}</p>
          <Link to="/login" className="block text-sm font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reset-token" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('auth.resetToken')}
            </label>
            <input
              id="reset-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] font-mono focus:outline-2 focus:outline-[#6366F1]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reset-pass" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('auth.newPassword')}
            </label>
            <input
              id="reset-pass"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reset-confirm" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="reset-confirm"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
            />
          </div>
          <Button type="submit" loading={submitting} className="w-full">
            {t('auth.updatePassword')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
