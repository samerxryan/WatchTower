import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './LoginPage.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/DataState.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuth } from './AuthContext.jsx';

export function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      // Never send role from registration form (enforced by 06_API_SPECIFICATION.md)
      await register({ fullName: fullName.trim(), email: email.trim(), password });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-name" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
            {t('auth.fullName')}
          </label>
          <input
            id="reg-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
            {t('auth.email')}
          </label>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
            {t('auth.password')}
          </label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-confirm" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
            {t('auth.confirmPassword')}
          </label>
          <input
            id="reg-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
          />
        </div>

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? t('common.loading') : t('auth.signUp')}
        </Button>
      </form>

      <p className="text-xs text-center text-[#64748B] dark:text-[#9CA3AF]">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
