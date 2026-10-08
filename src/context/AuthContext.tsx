import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setAuthToken, getAuthToken } from '../services/api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type UserRole = 'Admin' | 'Accountant' | 'Teacher';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar_url: string;
  linked_teacher_id: number | null;
  status: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  Admin: { email: 'admin@pinkedu.edu', pass: 'Admin@123' },
  Accountant: { email: 'accountant@pinkedu.edu', pass: 'Finance@123' },
  Teacher: { email: 'teacher@pinkedu.edu', pass: 'Teacher@123' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const login = async (email: string, password: string, remember = true) => {
    const res = await apiRequest<{
      success: boolean;
      message: string;
      token: string;
      user: AuthUser;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token, remember);
    setUser(res.user);
    showToast(res.message || 'Login successful', 'success');
  };

  const switchDemoRole = async (role: UserRole) => {
    try {
      const creds = DEMO_CREDENTIALS[role];
      const res = await apiRequest<{
        success: boolean;
        token: string;
        user: AuthUser;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: creds.email, password: creds.pass }),
      });
      setAuthToken(res.token, true);
      setUser(res.user);
      showToast(`Switched active session to ${role} (${res.user.name})`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Unable to switch role', 'error');
    }
  };

  const logout = () => {
    setAuthToken(null, false);
    setUser(null);
    showToast('Signed out of Suffah School session', 'info');
  };

  const refreshUser = async () => {
    try {
      const res = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      try {
        const existingToken = getAuthToken();
        if (existingToken) {
          const res = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
          if (mounted) {
            setUser(res.user);
            setLoading(false);
            return;
          }
        }
        // Auto-authenticate initial preview session with Admin JWT so the SaaS dashboard is immediately live
        const creds = DEMO_CREDENTIALS.Admin;
        const loginRes = await apiRequest<{
          success: boolean;
          token: string;
          user: AuthUser;
        }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: creds.email, password: creds.pass }),
        });
        if (mounted) {
          setAuthToken(loginRes.token, true);
          setUser(loginRes.user);
        }
      } catch {
        // Fallback to login screen if auto-auth fails
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        switchDemoRole,
        logout,
        refreshUser,
        showToast,
      }}
    >
      {children}

      {/* Global Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-sm transition-all duration-150 ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-900'
                : t.type === 'error'
                  ? 'bg-white border-rose-200 text-slate-900'
                  : 'bg-white border-pink-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-pink-600 shrink-0" />}
              <span className="text-xs font-medium leading-snug text-slate-800">{t.text}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
