import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';

type AuthContextValue = { authenticated: boolean; login: (username: string, password: string) => Promise<void>; logout: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem('gestao_access_token')));
  const logout = () => { localStorage.removeItem('gestao_access_token'); localStorage.removeItem('gestao_refresh_token'); setAuthenticated(false); };
  useEffect(() => { window.addEventListener('auth:unauthorized', logout); return () => window.removeEventListener('auth:unauthorized', logout); }, []);
  const value = useMemo(() => ({
    authenticated,
    login: async (username: string, password: string) => {
      const tokens = await apiRequest<{ access: string; refresh: string }>('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('gestao_access_token', tokens.access); localStorage.setItem('gestao_refresh_token', tokens.refresh); setAuthenticated(true);
    },
    logout,
  }), [authenticated]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider'); return context; }
