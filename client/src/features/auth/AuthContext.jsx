import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AUTH_EXPIRED_EVENT } from '../../services/apiClient.js';
import { authApi } from '../../services/watchtowerApi.js';
import { useTheme } from '../../styles/ThemeContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();
  const { setLanguage } = useI18n();

  const applyUserPreferences = useCallback(
    (account) => {
      if (account?.preferredTheme === 'light' || account?.preferredTheme === 'dark') {
        setTheme(account.preferredTheme);
      }
      if (account?.preferredLanguage === 'fr' || account?.preferredLanguage === 'en') {
        setLanguage(account.preferredLanguage);
      }
    },
    [setLanguage, setTheme],
  );

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      const account = response?.data || null;
      setUser(account);
      if (account) {
        applyUserPreferences(account);
      }
      return account;
    } catch {
      setUser(null);
      return null;
    }
  }, [applyUserPreferences]);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((response) => {
        if (!active) return;
        const account = response?.data || null;
        setUser(account);
        if (account) {
          applyUserPreferences(account);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [applyUserPreferences]);

  // When the API client cannot renew an expired session, clear the user so the
  // router redirects to login instead of leaving a stale authenticated shell.
  useEffect(() => {
    const onAuthExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    const account = response?.data?.user || response?.data || null;
    setUser(account);
    if (account) {
      applyUserPreferences(account);
    }
    return account;
  };

  const register = async (payload) => {
    const response = await authApi.register(payload);
    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
