import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarImage } from './ui/AvatarImage';
import { exportToCsv } from '../utils/exportUtils';
import { Check, Save, Download, Calendar, CheckCheck } from 'lucide-react';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

interface AttendanceModuleProps {
  mode: 'student' | 'teacher';
}

const STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Leave'];

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ mode }) => {
  const { user, showToast } = useAuth();
  const canMarkStudent = user?.role === 'Admin' || user?.role === 'Teacher';
  const canMarkTeacher = user?.role === 'Admin';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [classFilter, setClassFilter] = useState('Grade 10');
  const [sectionFilter, setSectionFilter] = useState('A');
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'history'>('register');

  const [roster, setRoster] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'student') {
        const res = await apiRequest('/api/student-attendance', {
          params: {
            date: selectedDate,
            class_name: classFilter,
            section: sectionFilter,
            month: selectedMonth,
          },
        });
        setRoster(res.roster || []);
        setHistory(res.history || []);
      } else {
        const res = await apiRequest('/api/teacher-attendance', {
          params: {
            date: selectedDate,
            month: selectedMonth,
          },
        });
        setRoster(res.roster || []);
        setHistory(res.history || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to load attendance register', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedDate, classFilter, sectionFilter, selectedMonth, showToast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const updateRowStatus = (idKey: 'student_id' | 'teacher_id', idVal: number, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((row) => (row[idKey] === idVal ? { ...row, status } : row))
    );
  };

  const updateRowRemarks = (idKey: 'student_id' | 'teacher_id', idVal: number, remarks: string) => {
    setRoster((prev) =>
      prev.map((row) => (row[idKey] === idVal ? { ...row, remarks } : row))
    );
  };

  const markAllPresent = () => {
    setRoster((prev) => prev.map((r) => ({ ...r, status: 'Present' })));
    showToast('Marked all listed records as Present. Click Save Attendance to commit.', 'info');
  };

  const handleSaveAttendance = async () => {
    if (roster.length === 0) return;
    setSaving(true);
    try {
      if (mode === 'student') {
        const res = await apiRequest('/api/student-attendance', {
          method: 'POST',
          body: JSON.stringify({
            date: selectedDate,
            records: roster.map((r) => ({
              student_id: r.student_id,
              class_name: r.class_name,
              section: r.section,
              status: r.status,
              remarks: r.remarks,
            })),
          }),
        });
        showToast(res.message || 'Attendance saved successfully', 'success');
      } else {
        const res = await apiRequest('/api/teacher-attendance', {
          method: 'POST',
          body: JSON.stringify({
            date: selectedDate,
            records: roster.map((r) => ({
              teacher_id: r.teacher_id,
              status: r.status,
              check_in_time: r.check_in_time,
              remarks: r.remarks,
            })),
          }),
        });
        showToast(res.message || 'Attendance saved successfully', 'success');
      }
      fetchAttendance();
    } catch (err: any) {
      showToast(err.message || 'Unable to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = roster.filter((r) => r.status === 'Present').length;
  const absentCount = roster.filter((r) => r.status === 'Absent').length;
  const lateCount = roster.filter((r) => r.status === 'Late').length;
  const leaveCount = roster.filter((r) => r.status === 'Leave').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'student' ? 'Student Attendance Register' : 'Teacher Attendance Register'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'student'
              ? 'Mark daily class roll-call, prevent duplicate entries per date, and track monthly attendance percentages.'
              : 'Record daily faculty attendance, check-in timestamps, and monthly attendance compliance.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher: Daily Roll-Call vs Monthly History */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveSubTab('register')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Register
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly History ({history.length})
            </button>
          </div>

          <button
            onClick={() => {
              exportToCsv(
                `pinkedu_${mode}_attendance_${selectedDate}`,
                activeSubTab === 'register' ? roster : history
              );
              showToast('Attendance report exported to CSV', 'success');
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Date Selection Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pink-600" />
            <label className="text-xs font-semibold text-slate-700">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-pink-600"
            />
          </div>

          {mode === 'student' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Class:</label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                >
                  <option value="">All Classes</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 7">Grade 7</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Section:</label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                >
                  <option value="">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
            </>
          )}

          {activeSubTab === 'history' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Live Status Summary & Save Button */}
        {activeSubTab === 'register' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono tabular-nums text-slate-600 flex items-center gap-3">
              <span className="text-emerald-700 font-semibold">Present: {presentCount}</span>
              <span>·</span>
              <span className="text-rose-600 font-semibold">Absent: {absentCount}</span>
              <span>·</span>
              <span className="text-amber-600 font-semibold">Late: {lateCount}</span>
              <span>·</span>
              <span className="text-slate-600 font-semibold">Leave: {leaveCount}</span>
            </div>

            {((mode === 'student' && canMarkStudent) || (mode === 'teacher' && canMarkTeacher)) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All Present</span>
                </button>
                <button
                  type="button"
                  disabled={saving || roster.length === 0}
                  onClick={handleSaveAttendance}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main View: Daily Attendance Marking Table OR Monthly History Table */}
      {activeSubTab === 'register' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">
                    {mode === 'student' ? 'Student & Roll No' : 'Teacher & Employee ID'}
                  </th>
                  <th className="py-3 px-4">
                    {mode === 'student' ? 'Class & Section' : 'Subject & Class'}
                  </th>
                  <th className="py-3 px-4 text-right">Overall Rate</th>
                  <th className="py-3 px-4">Mark Attendance Status</th>
                  <th className="py-3 px-4">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                      </td>
                    </tr>
                  ))
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No active {mode}s found for the selected class/section filter.
                    </td>
                  </tr>
                ) : (
                  roster.map((row) => {
                    const idKey = mode === 'student' ? 'student_id' : 'teacher_id';
                    const idVal = row[idKey];
                    const name = mode === 'student' ? row.student_name : row.teacher_name;
                    const subCode =
                      mode === 'student'
                        ? `${row.student_code} · Roll #${row.roll_number}`
                        : `${row.employee_id}`;
                    const canEdit =
                      (mode === 'student' && canMarkStudent) ||
                      (mode === 'teacher' && canMarkTeacher);

                    return (
                      <tr key={idVal} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <AvatarImage src={row.profile_image} name={name} size="sm" />
                            <div>
                              <p className="font-semibold text-slate-900">{name}</p>
                              <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                                {subCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {mode === 'student' ? (
                            <span>
                              {row.class_name} · Sec {row.section}
                            </span>
                          ) : (
                            <span>
                              {row.subject_specialization} · {row.assigned_class}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {row.attendancePercentage}%
                        </td>
                        <td className="py-3 px-4">
                          {/* Interactive Segmented Status Buttons */}
                          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                            {STATUSES.map((st) => {
                              const active = row.status === st;
                              const activeStyle =
                                st === 'Present'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : st === 'Absent'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : st === 'Late'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-slate-700 text-white shadow-sm';
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => updateRowStatus(idKey, idVal, st)}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                                    active
                                      ? activeStyle
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={row.remarks || ''}
                            onChange={(e) => updateRowRemarks(idKey, idVal, e.target.value)}
                            placeholder="Optional note..."
                            className="w-full max-w-xs px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-pink-600 disabled:bg-slate-50"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Monthly Attendance History View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">
                    {mode === 'student' ? 'Student & Roll' : 'Teacher & ID'}
                  </th>
                  <th className="py-3 px-4">
                    {mode === 'student' ? 'Class & Section' : 'Check-In Time'}
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No historical attendance records found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-800 tabular-nums">
                        {h.attendance_date}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {mode === 'student' ? h.student_name : h.teacher_name}
                        </p>
                        <p className="font-mono text-slate-500 tabular-nums">
                          {mode === 'student'
                            ? `${h.student_code} · #${h.roll_number}`
                            : h.employee_id}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                        {mode === 'student'
                          ? `${h.class_name} (${h.section})`
                          : h.check_in_time || '--:--'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold inline-flex items-center gap-1 ${
                            h.status === 'Present'
                              ? 'text-emerald-700'
                              : h.status === 'Absent'
                                ? 'text-rose-600'
                                : h.status === 'Late'
                                  ? 'text-amber-600'
                                  : 'text-slate-600'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{h.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{h.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
