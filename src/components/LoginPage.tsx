import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Lock, Mail, ArrowRight, Eye, EyeOff, KeyRound, GraduationCap } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, showToast } = useAuth();
  const [email, setEmail] = useState('admin@pinkedu.edu');
  const [password, setPassword] = useState('Admin@123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password Modal State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      const msg = err.message || 'Invalid login credentials';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fillRoleCredentials = (role: UserRole) => {
    setErrorMsg('');
    if (role === 'Admin') {
      setEmail('admin@pinkedu.edu');
      setPassword('Admin@123');
    } else if (role === 'Accountant') {
      setEmail('accountant@pinkedu.edu');
      setPassword('Finance@123');
    } else {
      setEmail('teacher@pinkedu.edu');
      setPassword('Teacher@123');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSending(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: forgotEmail }),
        }
      );
      showToast(res.message, 'info');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err: any) {
      showToast(err.message || 'Unable to process recovery request', 'error');
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#FAFAFB]">
      {/* Left Column: Architectural Campus Hero with Pink/Rose Gradient Scrim */}
      <div className="hidden lg:flex lg:col-span-7 relative overflow-hidden bg-slate-950 flex-col justify-between p-12">
        <img
          src="/src/assets/images/campus_login_backdrop_1790499570635.jpg"
          alt="PinkEdu Academy Campus Courtyard"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-rose-950/55 to-pink-900/30" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-600 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Suffah School</span>
        </div>

        <div className="relative z-10 max-w-xl space-y-5">
          <p className="text-xs font-medium text-pink-200 tracking-wide">
            Institutional Academic & Financial ERP
          </p>
          <h1
            className="text-3xl xl:text-4xl font-bold text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Unified school operations, student records, attendance, and financial governance.
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed max-w-lg">
            Designed for principals, bursars, and faculty to manage admissions, daily attendance
            rosters, fee invoicing, and payroll disbursements from a single source of truth.
          </p>
          <div className="pt-4 border-t border-white/15 flex items-center gap-8 text-xs text-slate-200">
            <div>
              <p className="font-mono font-semibold text-lg text-white tabular-nums">100%</p>
              <p className="text-slate-300">Relational Audit Trail</p>
            </div>
            <div>
              <p className="font-mono font-semibold text-lg text-white tabular-nums">3 Roles</p>
              <p className="text-slate-300">Admin · Accountant · Teacher</p>
            </div>
            <div>
              <p className="font-mono font-semibold text-lg text-white tabular-nums">Real-Time</p>
              <p className="text-slate-300">Attendance & Fee Ledger</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="col-span-1 lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 xl:px-16 bg-white border-l border-slate-200">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Mobile Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Suffah School</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Sign in to your portal
            </h2>
            <p className="text-sm text-slate-600">
              Enter your institutional credentials or select a role preset below.
            </p>
          </div>

          {/* Interactive Role Preset Controls */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">
              Quick Role Credentials
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
              {(['Admin', 'Accountant', 'Teacher'] as UserRole[]).map((role) => {
                const isSelected =
                  (role === 'Admin' && email === 'admin@pinkedu.edu') ||
                  (role === 'Accountant' && email === 'accountant@pinkedu.edu') ||
                  (role === 'Teacher' && email === 'teacher@pinkedu.edu');
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => fillRoleCredentials(role)}
                    className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-pink-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pinkedu.edu"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-600/15"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotOpen(true);
                }}
                className="font-medium text-pink-600 hover:text-pink-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In to Suffah School'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">Default Institutional Credentials:</p>
            <p className="font-mono">Admin: admin@pinkedu.edu · Admin@123</p>
            <p className="font-mono">Accountant: accountant@pinkedu.edu · Finance@123</p>
            <p className="font-mono">Teacher: teacher@pinkedu.edu · Teacher@123</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Password Recovery</h3>
                <p className="text-xs text-slate-500">
                  Reset instructions will be sent to your institutional email.
                </p>
              </div>
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@pinkedu.edu"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-pink-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotSending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg"
                >
                  {forgotSending ? 'Sending...' : 'Send Recovery Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
