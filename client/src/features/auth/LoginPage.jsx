import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { WatchTowerLogo } from '../../components/ui/WatchTowerLogo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/DataState.jsx';
import { useTheme } from '../../styles/ThemeContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuth } from './AuthContext.jsx';

export function AuthLayout({ title, subtitle, children }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B1120] text-[#111827] dark:text-[#F8FAFC]">
      <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#111827]">
        <WatchTowerLogo />
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg p-1 bg-[#F1F5F9] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#273449]">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                language === 'fr'
                  ? 'bg-[#FFFFFF] dark:bg-[#111827] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#64748B] dark:text-[#9CA3AF]'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                language === 'en'
                  ? 'bg-[#FFFFFF] dark:bg-[#111827] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#64748B] dark:text-[#9CA3AF]'
              }`}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#1F2937] text-[#64748B] dark:text-[#9CA3AF]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="p-6 sm:p-8 rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(t('common.errorTitle'));
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
            {t('auth.email')}
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
            placeholder="name@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-medium text-[#64748B] dark:text-[#9CA3AF]">
              {t('auth.password')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline"
            >
              {t('auth.forgotLink')}
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] focus:outline-2 focus:outline-[#6366F1]"
          />
        </div>

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? t('common.loading') : t('auth.signIn')}
        </Button>
      </form>

      <p className="text-xs text-center text-[#64748B] dark:text-[#9CA3AF]">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-[#6366F1] dark:text-[#818CF8] hover:underline">
          {t('auth.signUp')}
        </Link>
      </p>
    </AuthLayout>
  );
}
