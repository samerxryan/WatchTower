import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../../services/watchtowerApi.js';
import { getPreviewRole, setPreviewRole } from '../../services/previewStore.js';
import { useTheme } from '../../styles/ThemeContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(() => Boolean(getPreviewRole()));
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

  const login = async (credentials) => {
    setPreviewRole(null);
    setPreviewMode(false);
    const response = await authApi.login(credentials);
    const account = response?.data?.user || response?.data || null;
    setUser(account);
    if (account) {
      applyUserPreferences(account);
    }
    return account;
  };

  const register = async (payload) => {
    setPreviewRole(null);
    setPreviewMode(false);
    const response = await authApi.register(payload);
    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setPreviewRole(null);
      setPreviewMode(false);
      setUser(null);
    }
  };

  const enterPreviewMode = async (role) => {
    setPreviewRole(role);
    setPreviewMode(true);
    const response = await authApi.me();
    const account = response?.data || null;
    setUser(account);
    return account;
  };

  const exitPreviewMode = () => {
    setPreviewRole(null);
    setPreviewMode(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        previewMode,
        login,
        register,
        logout,
        refreshUser,
        enterPreviewMode,
        exitPreviewMode,
      }}
    >
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
