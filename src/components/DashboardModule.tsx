import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { AvatarImage } from './ui/AvatarImage';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Plus,
  UserCheck,
  CreditCard,
  FileBarChart,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export type ModuleKey =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'student-attendance'
  | 'teacher-attendance'
  | 'student-fees'
  | 'teacher-salaries'
  | 'reports'
  | 'settings';

interface DashboardProps {
  onNavigate: (module: ModuleKey) => void;
}

const GENDER_COLORS = ['#db2777', '#0f172a', '#64748b'];
const ATTENDANCE_COLORS: Record<string, string> = {
  Present: '#16a34a',
  Absent: '#e11d48',
  Late: '#d97706',
  Leave: '#475569',
};

export const DashboardModule: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white border border-slate-200 rounded-xl p-4 animate-pulse flex flex-col justify-between"
            >
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-6 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-700">
          {error || 'Unable to load dashboard statistics'}
        </p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const {
    kpis,
    charts,
    recentStudents,
    recentFeePayments,
    recentAttendance,
    upcomingFeeDeadlines,
  } = data;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive School Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live relational metrics across student enrollment, faculty attendance, fee collection, and
            payroll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('students')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Admit Student</span>
          </button>
          <button
            onClick={() => onNavigate('student-attendance')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-pink-600" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => onNavigate('student-fees')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-pink-600" />
            <span>Collect Fee</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <FileBarChart className="w-3.5 h-3.5 text-pink-600" />
            <span>Reports</span>
          </button>
          <button
            onClick={fetchDashboard}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh Live Metrics"
            aria-label="Refresh Live Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 10 Real-Time Database KPIs in a Structured 5x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Students */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Students</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.totalStudents}
            </p>
            <p className="text-xs text-slate-500 mt-1">Active enrolled scholars</p>
          </div>
        </div>

        {/* 2. Total Teachers */}
        <div
          onClick={() => onNavigate('teachers')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Teachers</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.totalTeachers}
            </p>
            <p className="text-xs text-slate-500 mt-1">Active faculty members</p>
          </div>
        </div>

        {/* 3. Total Classes */}
        <div
          onClick={() => onNavigate('classes')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Classes</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.totalClasses}
            </p>
            <p className="text-xs text-slate-500 mt-1">Active grade sections</p>
          </div>
        </div>

        {/* 4. Total Subjects */}
        <div
          onClick={() => onNavigate('subjects')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Subjects</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.totalSubjects}
            </p>
            <p className="text-xs text-slate-500 mt-1">Curriculum courses</p>
          </div>
        </div>

        {/* 5. Today's Student Attendance */}
        <div
          onClick={() => onNavigate('student-attendance')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today&apos;s Student Att.</span>
            <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
              {kpis.todayStudentAttendance.percentage}%
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.todayStudentAttendance.present}/{kpis.todayStudentAttendance.total}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
              Absent: {kpis.todayStudentAttendance.absent} · Late: {kpis.todayStudentAttendance.late}
            </p>
          </div>
        </div>

        {/* 6. Today's Teacher Attendance */}
        <div
          onClick={() => onNavigate('teacher-attendance')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today&apos;s Teacher Att.</span>
            <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
              {kpis.todayTeacherAttendance.percentage}%
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.todayTeacherAttendance.present}/{kpis.todayTeacherAttendance.total}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
              Late: {kpis.todayTeacherAttendance.late} · Leave: {kpis.todayTeacherAttendance.leave}
            </p>
          </div>
        </div>

        {/* 7. Total Fees Collected */}
        <div
          onClick={() => onNavigate('student-fees')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Fees Collected</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {formatCurrency(kpis.totalFeesCollected)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Verified tuition receipts</p>
          </div>
        </div>

        {/* 8. Pending Fees */}
        <div
          onClick={() => onNavigate('student-fees')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Fees</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-rose-600">
              {formatCurrency(kpis.pendingFees)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total Fees − Paid Fees</p>
          </div>
        </div>

        {/* 9. Total Salaries */}
        <div
          onClick={() => onNavigate('teacher-salaries')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Salaries Paid</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {formatCurrency(kpis.totalSalaries)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Disbursed faculty payroll</p>
          </div>
        </div>

        {/* 10. Pending Salaries */}
        <div
          onClick={() => onNavigate('teacher-salaries')}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Salaries</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-amber-600">
              {formatCurrency(kpis.pendingSalaries)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Awaiting disbursement</p>
          </div>
        </div>
      </div>

      {/* Analytics Row 1: Finance Overview & Attendance Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Finance Chart (Fee Collection vs Pending Fees vs Salary Expenses) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Financial Cashflow & Payroll Analytics
              </h2>
              <p className="text-xs text-slate-500">
                Monthly fee collection, outstanding fee receivables, and faculty salary expenses
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Net Balance: {formatCurrency(kpis.totalFeesCollected - kpis.totalSalaries)}
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyFinance} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="feeCollected"
                  name="Fee Collected ($)"
                  fill="#db2777"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="pendingFees"
                  name="Pending Fees ($)"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="salaryExpense"
                  name="Salary Expenses ($)"
                  fill="#0f172a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Breakdown Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">Attendance Distribution</h2>
            <p className="text-xs text-slate-500">
              Present · Absent · Late · Leave breakdown
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.attendanceBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  dataKey="status"
                  type="category"
                  tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Records" radius={[0, 4, 4, 0]}>
                  {charts.attendanceBreakdown.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={ATTENDANCE_COLORS[entry.status] || '#db2777'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics Row 2: Student Statistics (Monthly Admissions, Students by Class, Male vs Female) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Student Admissions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">Monthly Student Admissions</h2>
            <p className="text-xs text-slate-500">2026 academic year intake curve</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyAdmissions}>
                <defs>
                  <linearGradient id="pinkAdmissionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#db2777" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#db2777" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="admissions"
                  name="Admissions"
                  stroke="#db2777"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pinkAdmissionsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Students by Class */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">Students by Class</h2>
            <p className="text-xs text-slate-500">Enrollment distribution across grades</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.studentsByClass}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="className" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="students"
                  name="Students"
                  fill="#be185d"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Male vs Female Students */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">Male vs Female Scholars</h2>
            <p className="text-xs text-slate-500">Student gender ratio across academy</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.genderDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {charts.genderDistribution.map((_: any, index: number) => (
                    <Cell
                      key={`gender-cell-${index}`}
                      fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Tables: Recent Registrations, Recent Fee Payments, Upcoming Deadlines & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Student Registrations */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Student Registrations</h3>
              <p className="text-xs text-slate-500">Latest admitted scholars</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              View Directory
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Class & Roll</th>
                  <th className="py-2.5 px-4 text-right">Admitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentStudents.map((stu: any) => (
                  <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <AvatarImage src={stu.profile_image} name={stu.student_name} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900">{stu.student_name}</p>
                          <p className="font-mono text-slate-500 tabular-nums">
                            {stu.student_id} · {stu.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      <span>{stu.class_name}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono tabular-nums">Sec {stu.section}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        #{stu.roll_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {stu.admission_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Fee Payments */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Fee Payments</h3>
              <p className="text-xs text-slate-500">Latest verified bursar receipts</p>
            </div>
            <button
              onClick={() => onNavigate('student-fees')}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              Fee Ledger
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                  <th className="py-2.5 px-4">Receipt & Student</th>
                  <th className="py-2.5 px-4">Method & Date</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentFeePayments.map((pay: any) => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-slate-900">{pay.student_name}</p>
                      <p className="font-mono text-slate-500 tabular-nums">
                        {pay.receipt_number} · {pay.class_name}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <span>{pay.payment_method}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono tabular-nums">{pay.payment_date}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(pay.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Fee Deadlines */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upcoming Fee Deadlines</h3>
              <p className="text-xs text-slate-500">Pending & partial tuition balances</p>
            </div>
            <button
              onClick={() => onNavigate('student-fees')}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              Record Payment
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                  <th className="py-2.5 px-4">Student & Invoice</th>
                  <th className="py-2.5 px-4">Due Date & Status</th>
                  <th className="py-2.5 px-4 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {upcomingFeeDeadlines.map((fee: any) => (
                  <tr key={fee.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-slate-900">{fee.student_name}</p>
                      <p className="font-mono text-slate-500 tabular-nums">
                        {fee.invoice_number} · {fee.class_name}
                      </p>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-slate-700 tabular-nums">{fee.due_date}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span
                        className={`font-semibold ${
                          fee.status === 'Pending' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      >
                        {fee.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-rose-600 tabular-nums">
                      {formatCurrency(fee.remaining_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Attendance Log */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Student Attendance</h3>
              <p className="text-xs text-slate-500">Latest daily roll-call entries</p>
            </div>
            <button
              onClick={() => onNavigate('student-attendance')}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              Attendance Register
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Class & Date</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentAttendance.map((att: any) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-slate-900">{att.student_name}</p>
                      <p className="font-mono text-slate-500 tabular-nums">
                        Roll #{att.roll_number} · {att.remarks || 'Verified'}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <span>
                        {att.class_name} ({att.section})
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono tabular-nums">{att.attendance_date}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={`font-semibold ${
                          att.status === 'Present'
                            ? 'text-emerald-700'
                            : att.status === 'Absent'
                              ? 'text-rose-600'
                              : att.status === 'Late'
                                ? 'text-amber-600'
                                : 'text-slate-600'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
