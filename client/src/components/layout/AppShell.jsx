import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  CheckSquare,
  FolderKanban,
  GanttChartSquare,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PieChart,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { WatchTowerLogo } from '../ui/WatchTowerLogo.jsx';
import { Avatar } from '../ui/DataState.jsx';
import { useTheme } from '../../styles/ThemeContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { NOTIFICATIONS_UPDATED_EVENT, notificationsApi } from '../../services/watchtowerApi.js';

export function AppShell({ children }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    notificationsApi
      .unreadCount()
      .then((res) => {
        if (active) setUnreadCount(res?.data?.count || 0);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });
    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return undefined;
    const onNotificationsUpdated = (event) => {
      const count = event?.detail?.unreadCount;
      if (typeof count === 'number') setUnreadCount(count);
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
  }, [user]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, key: 'nav.dashboard', end: true },
    { to: '/projects', icon: FolderKanban, key: 'nav.projects' },
    { to: '/tasks', icon: CheckSquare, key: 'nav.tasks' },
    { to: '/kanban', icon: Kanban, key: 'nav.kanban' },
    { to: '/calendar', icon: Calendar, key: 'nav.calendar' },
    { to: '/timeline', icon: GanttChartSquare, key: 'nav.timeline' },
    { to: '/reports', icon: PieChart, key: 'nav.reports' },
    ...(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER'
      ? [{ to: '/team', icon: Users, key: 'nav.team' }]
      : []),
    { to: '/notifications', icon: Bell, key: 'nav.notifications', badge: unreadCount },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return t('nav.dashboard');
    if (path.startsWith('/projects')) return t('nav.projects');
    if (path.startsWith('/tasks')) return t('nav.tasks');
    if (path.startsWith('/kanban')) return t('nav.kanban');
    if (path.startsWith('/calendar')) return t('nav.calendar');
    if (path.startsWith('/timeline')) return t('nav.timeline');
    if (path.startsWith('/reports')) return t('nav.reports');
    if (path.startsWith('/team')) return t('nav.team');
    if (path.startsWith('/notifications')) return t('nav.notifications');
    if (path.startsWith('/settings')) return t('nav.settings');
    return t('brand');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const renderNav = (onSelect) => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label={t('nav.primary')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onSelect}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#6366F1]/10 text-[#4338CA] dark:bg-[#818CF8]/15 dark:text-[#A5B4FC]'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] dark:text-[#9CA3AF] dark:hover:text-[#F8FAFC] dark:hover:bg-[#1F2937]'
                }`
              }
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(item.key)}</span>
              </span>
              {item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-md bg-[#6366F1] text-white dark:bg-[#818CF8] dark:text-[#0B1120] tabular-nums">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#E2E8F0] dark:border-[#273449] space-y-1">
        <NavLink
          to="/settings"
          onClick={onSelect}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[#6366F1]/10 text-[#4338CA] dark:bg-[#818CF8]/15 dark:text-[#A5B4FC]'
                : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] dark:text-[#9CA3AF] dark:hover:text-[#F8FAFC] dark:hover:bg-[#1F2937]'
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('nav.settings')}</span>
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 dark:text-[#9CA3AF] dark:hover:text-[#F87171] transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('topbar.logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B1120] text-[#111827] dark:text-[#F8FAFC]">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 bg-[#FFFFFF] dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#273449]">
        <div className="h-16 px-5 flex items-center border-b border-[#E2E8F0] dark:border-[#273449]">
          <WatchTowerLogo />
        </div>
        {renderNav()}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1120]/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[82vw] flex flex-col bg-[#FFFFFF] dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#273449]">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#273449]">
              <WatchTowerLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t('topbar.closeMenu')}
                className="p-2 rounded-lg text-[#64748B] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNav(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#FFFFFF] dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#273449]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('topbar.openMenu')}
              className="lg:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] dark:text-[#9CA3AF] dark:hover:bg-[#1F2937]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div
              className="inline-flex items-center rounded-lg p-1 bg-[#F1F5F9] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#273449]"
              role="group"
              aria-label={t('topbar.languageLabel')}
            >
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
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
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
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
              className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#1F2937] text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NavLink
              to="/notifications"
              aria-label={t('topbar.unreadNotifications')}
              className="relative p-2 rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#FFFFFF] dark:bg-[#1F2937] text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#6366F1] dark:bg-[#818CF8] text-[10px] font-semibold text-white dark:text-[#0B1120] flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </NavLink>

            {user && (
              <NavLink
                to="/settings"
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937] transition-colors"
              >
                <Avatar name={user.fullName} size="sm" />
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-medium truncate max-w-[120px]">{user.fullName}</p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                    {t(`roles.${user.role}`)}
                  </p>
                </div>
              </NavLink>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
