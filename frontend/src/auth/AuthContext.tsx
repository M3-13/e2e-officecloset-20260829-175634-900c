import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clearAuth, getEmail, getToken, persistAuth } from '../api/client';

interface AuthContextValue {
  token: string | null;
  email: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [email, setEmail] = useState<string | null>(() => getEmail());

  const login = useCallback((newToken: string, newEmail: string) => {
    persistAuth(newToken, newEmail);
    setToken(newToken);
    setEmail(newEmail);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({ token, email, login, logout }),
    [token, email, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
