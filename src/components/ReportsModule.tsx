import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportToCsv, triggerPrintDocument } from '../utils/exportUtils';
import { Search, Download, Printer, FileText } from 'lucide-react';

type ReportCategory = 'students' | 'attendance' | 'finance';

export const ReportsModule: React.FC = () => {
  const { showToast } = useAuth();

  const [category, setCategory] = useState<ReportCategory>('finance');
  const [subType, setSubType] = useState<string>('summary');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/reports', {
        params: {
          search,
          class_name: classFilter,
          status: statusFilter,
          startDate,
          endDate,
        },
      });
      setReportData(res);
    } catch (err: any) {
      showToast(err.message || 'Unable to generate reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter, startDate, endDate, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportExcel = () => {
    if (!reportData) return;
    if (category === 'students') {
      exportToCsv('pinkedu_student_report', reportData.students.records || []);
    } else if (category === 'attendance') {
      exportToCsv(
        'pinkedu_attendance_report',
        subType === 'teacher'
          ? reportData.attendance.teacherRecords
          : subType === 'absent'
            ? reportData.attendance.absentStudents
            : reportData.attendance.studentRecords
      );
    } else {
      exportToCsv(
        'pinkedu_financial_report',
        subType === 'salaries'
          ? reportData.finance.salaryRecords
          : reportData.finance.feeRecords
      );
    }
    showToast('Report exported to Excel-compatible CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Institutional Reports & Audit Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate, filter, print, and export Student, Attendance, and Financial reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={triggerPrintDocument}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-pink-600" />
            <span>Print Report</span>
          </button>
          <button
            onClick={triggerPrintDocument}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-pink-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Category & Sub-Report Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'finance', label: 'Financial Reports' },
                { id: 'students', label: 'Student Reports' },
                { id: 'attendance', label: 'Attendance Reports' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCategory(tab.id);
                  setSubType('all');
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  category === tab.id
                    ? 'bg-white text-pink-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-report filter pills */}
          {category === 'finance' && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'all', label: 'Net Summary & Fees' },
                { id: 'pending_fees', label: 'Pending Fees' },
                { id: 'paid_fees', label: 'Paid Fees' },
                { id: 'salaries', label: 'Salary Expenses' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubType(s.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    subType === s.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {category === 'attendance' && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'all', label: 'Student Attendance' },
                { id: 'absent', label: 'Absent Students' },
                { id: 'teacher', label: 'Teacher Attendance' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubType(s.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    subType === s.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search, Class, Status & Date Range Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, invoice..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Classes</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 7">Grade 7</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* Report Content Body */}
      {loading || !reportData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
          Generating institutional report...
        </div>
      ) : category === 'finance' ? (
        <div className="space-y-6">
          {/* Net Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Fee Collection (Income)</p>
              <p className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
                ${reportData.finance.summary.totalFeeCollected.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Pending Fees</p>
              <p className="text-xl font-bold font-mono text-rose-600 tabular-nums mt-1">
                ${reportData.finance.summary.totalPendingFees.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Salary Expenses (Paid)</p>
              <p className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                ${reportData.finance.summary.totalSalaryPaid.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Pending Salaries</p>
              <p className="text-xl font-bold font-mono text-amber-600 tabular-nums mt-1">
                ${reportData.finance.summary.totalPendingSalaries.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Net Financial Balance</p>
              <p className="text-xl font-bold font-mono text-pink-700 tabular-nums mt-1">
                ${reportData.finance.summary.netFinancialPosition.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Financial Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {subType === 'salaries'
                  ? 'Faculty Salary Expenses & Pending Payroll Report'
                  : 'Student Fee Collection & Receivables Report'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              {subType === 'salaries' ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Slip & Teacher</th>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-right">Net Salary</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Pending</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {reportData.finance.salaryRecords.map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-4 font-sans">
                          <span className="font-semibold text-slate-900">{s.teacher_name}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="font-mono text-slate-500">{s.slip_number}</span>
                        </td>
                        <td className="py-2.5 px-4">{s.salary_month}</td>
                        <td className="py-2.5 px-4 text-right">${s.net_salary}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700">
                          ${s.paid_amount}
                        </td>
                        <td className="py-2.5 px-4 text-right text-amber-600">
                          ${s.remaining_salary}
                        </td>
                        <td className="py-2.5 px-4 font-sans font-semibold">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Invoice & Student</th>
                      <th className="py-3 px-4">Class & Month</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Pending</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {reportData.finance.feeRecords
                      .filter((f: any) =>
                        subType === 'pending_fees'
                          ? f.remaining_amount > 0
                          : subType === 'paid_fees'
                            ? f.status === 'Paid'
                            : true
                      )
                      .map((f: any) => (
                        <tr key={f.id}>
                          <td className="py-2.5 px-4 font-sans">
                            <span className="font-semibold text-slate-900">{f.student_name}</span>
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="font-mono text-slate-500">{f.invoice_number}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            {f.class_name} · {f.fee_month}
                          </td>
                          <td className="py-2.5 px-4 text-right">${f.total_amount}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700">
                            ${f.paid_amount}
                          </td>
                          <td className="py-2.5 px-4 text-right text-rose-600">
                            ${f.remaining_amount}
                          </td>
                          <td className="py-2.5 px-4 font-sans font-semibold">{f.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : category === 'students' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Student Enrollment & Admission Report ({reportData.students.totalCount} Scholars)
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Active: {reportData.students.activeCount} · Inactive:{' '}
              {reportData.students.inactiveCount}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4">Student ID & Name</th>
                  <th className="py-3 px-4">Class & Roll</th>
                  <th className="py-3 px-4">Father&apos;s Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Admission Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.students.records.map((s: any) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-900">{s.student_name}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono text-slate-500">{s.student_id}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {s.class_name} ({s.section}) · #{s.roll_number}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{s.father_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{s.phone}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{s.admission_date}</td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-700">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Attendance Reports */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {subType === 'teacher'
                ? 'Faculty Attendance Report'
                : subType === 'absent'
                  ? 'Absent Students Follow-Up Report'
                  : 'Student Daily & Monthly Attendance Report'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Name & ID</th>
                  <th className="py-3 px-4">Class / Specialization</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(subType === 'teacher'
                  ? reportData.attendance.teacherRecords
                  : subType === 'absent'
                    ? reportData.attendance.absentStudents
                    : reportData.attendance.studentRecords
                ).map((a: any) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4 font-mono text-slate-800">{a.attendance_date}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-900">
                        {a.student_name || a.teacher_name}
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono text-slate-500">
                        {a.student_code || a.employee_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {a.class_name ? `${a.class_name} (${a.section})` : a.subject_specialization}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      <span
                        className={
                          a.status === 'Present'
                            ? 'text-emerald-700'
                            : a.status === 'Absent'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{a.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
