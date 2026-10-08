import React, { useState } from 'react';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { DashboardModule, ModuleKey } from './components/DashboardModule';
import { StudentsModule } from './components/StudentsModule';
import { TeachersModule } from './components/TeachersModule';
import { AttendanceModule } from './components/AttendanceModule';
import { AcademicModule } from './components/AcademicModule';
import { FeesModule } from './components/FeesModule';
import { SalariesModule } from './components/SalariesModule';
import { ReportsModule } from './components/ReportsModule';
import { SettingsUsersModule } from './components/SettingsUsersModule';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { AvatarImage } from './components/ui/AvatarImage';
import { AiAssistant } from './components/AiAssistant';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  CalendarCheck,
  UserCheck,
  CreditCard,
  Wallet,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Admin', 'Accountant', 'Teacher'],
  },
  {
    key: 'students',
    label: 'Students',
    icon: Users,
    roles: ['Admin', 'Teacher'],
  },
  {
    key: 'teachers',
    label: 'Teachers',
    icon: GraduationCap,
    roles: ['Admin'],
  },
  {
    key: 'classes',
    label: 'Classes',
    icon: Layers,
    roles: ['Admin', 'Teacher'],
  },
  {
    key: 'subjects',
    label: 'Subjects',
    icon: BookOpen,
    roles: ['Admin', 'Teacher'],
  },
  {
    key: 'student-attendance',
    label: 'Student Attendance',
    icon: CalendarCheck,
    roles: ['Admin', 'Teacher'],
  },
  {
    key: 'teacher-attendance',
    label: 'Teacher Attendance',
    icon: UserCheck,
    roles: ['Admin', 'Teacher'],
  },
  {
    key: 'student-fees',
    label: 'Student Fees',
    icon: CreditCard,
    roles: ['Admin', 'Accountant'],
  },
  {
    key: 'teacher-salaries',
    label: 'Teacher Salaries',
    icon: Wallet,
    roles: ['Admin', 'Accountant'],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    roles: ['Admin', 'Accountant'],
  },
  {
    key: 'settings',
    label: 'Users & Profile',
    icon: Settings,
    roles: ['Admin', 'Accountant', 'Teacher'],
  },
];

const WorkspaceShell: React.FC = () => {
  const { user, loading, logout, switchDemoRole } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-pink-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Initializing Suffah School ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const allowedNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleNavigate = (mod: ModuleKey) => {
    setActiveModule(mod);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFB] text-slate-900">
      {/* Desktop Sidebar Navigation (260px width) */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-white border-r border-slate-200 no-print">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">Suffah School</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-pink-50 text-pink-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-pink-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Sidebar Profile & Role Switcher */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-slate-500">Active Role Session</p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Admin', 'Accountant', 'Teacher'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    switchDemoRole(role);
                    setActiveModule('dashboard');
                  }}
                  className={`py-1 px-1.5 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                    user.role === role
                      ? 'bg-white text-pink-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarImage src={user.avatar_url} name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user.role} · {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col z-10 shadow-xl">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold tracking-tight text-slate-900">Suffah School</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg ${
                      isActive
                        ? 'bg-pink-50 text-pink-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Zone 1 (Single Brand/Context Title) — Zone 2 (4-5 Clean Text Links) — Zone 3 (1-2 Actions) */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 no-print">
          {/* Zone 1: Single text element wordmark / breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate('dashboard');
              }}
              className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap"
            >
              Suffah School
            </a>
          </div>

          {/* Zone 2: Global Search Bar + Clean text navigation links */}
          <div className="flex-1 flex items-center justify-center gap-6 px-4 max-w-2xl">
            <GlobalSearchBar onNavigate={handleNavigate} />
            <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600 shrink-0">
              <button
                onClick={() => handleNavigate('dashboard')}
                className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer ${
                  activeModule === 'dashboard' ? 'text-pink-600 font-semibold' : ''
                }`}
              >
                Overview
              </button>
              {user.role !== 'Accountant' && (
                <button
                  onClick={() => handleNavigate('students')}
                  className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer ${
                    activeModule === 'students' ? 'text-pink-600 font-semibold' : ''
                  }`}
                >
                  Scholars
                </button>
              )}
              {user.role !== 'Teacher' && (
                <button
                  onClick={() => handleNavigate('student-fees')}
                  className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer ${
                    activeModule === 'student-fees' ? 'text-pink-600 font-semibold' : ''
                  }`}
                >
                  Fees
                </button>
              )}
              {user.role !== 'Teacher' && (
                <button
                  onClick={() => handleNavigate('reports')}
                  className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer ${
                    activeModule === 'reports' ? 'text-pink-600 font-semibold' : ''
                  }`}
                >
                  Reports
                </button>
              )}
            </nav>
          </div>

          {/* Zone 3: 1-2 Primary Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleNavigate('settings')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {user.name} · {user.role}
            </button>
            <button
              onClick={logout}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          <AiAssistant />
          {activeModule === 'dashboard' && <DashboardModule onNavigate={handleNavigate} />}
          {activeModule === 'students' && <StudentsModule />}
          {activeModule === 'teachers' && <TeachersModule />}
          {activeModule === 'classes' && <AcademicModule mode="classes" />}
          {activeModule === 'subjects' && <AcademicModule mode="subjects" />}
          {activeModule === 'student-attendance' && <AttendanceModule mode="student" />}
          {activeModule === 'teacher-attendance' && <AttendanceModule mode="teacher" />}
          {activeModule === 'student-fees' && <FeesModule />}
          {activeModule === 'teacher-salaries' && <SalariesModule />}
          {activeModule === 'reports' && <ReportsModule />}
          {activeModule === 'settings' && <SettingsUsersModule />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceShell />
    </AuthProvider>
  );
}
