import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportToCsv, triggerPrintDocument } from '../utils/exportUtils';
import {
  Search,
  Plus,
  Download,
  CreditCard,
  Printer,
  Edit2,
  Trash2,
  X,
  GraduationCap,
} from 'lucide-react';

export const SalariesModule: React.FC = () => {
  const { user, showToast } = useAuth();
  const canManagePayroll = user?.role === 'Admin' || user?.role === 'Accountant';
  const isAdmin = user?.role === 'Admin';

  const [salaries, setSalaries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalNetPayroll: 0,
    totalDisbursed: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Create / Edit Salary Modal
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<any | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    teacher_id: '',
    salary_month: new Date().toISOString().slice(0, 7),
    basic_salary: 4500,
    bonus: 200,
    deduction: 50,
    paid_amount: 0,
    payment_method: 'Bank',
    notes: '',
  });

  // Pay Salary Modal
  const [payTarget, setPayTarget] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: 0,
    payment_method: 'Bank',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Printable Salary Slip Modal
  const [slipTarget, setSlipTarget] = useState<any | null>(null);

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    try {
      const [salRes, tchRes] = await Promise.all([
        apiRequest('/api/teacher-salaries', {
          params: {
            search,
            status: statusFilter,
            salary_month: monthFilter,
          },
        }),
        apiRequest('/api/teachers'),
      ]);
      setSalaries(salRes.salaries || []);
      setSummary(
        salRes.summary || {
          totalNetPayroll: 0,
          totalDisbursed: 0,
          totalPending: 0,
          paidCount: 0,
          pendingCount: 0,
        }
      );
      setTeachers(tchRes.teachers || []);
    } catch (err: any) {
      showToast(err.message || 'Unable to load teacher salaries', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, monthFilter, showToast]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  // Automatic calculation: Net Salary = Basic Salary + Bonus - Deduction
  const computedNetSalary = Math.max(
    0,
    Number(salaryForm.basic_salary || 0) +
      Number(salaryForm.bonus || 0) -
      Number(salaryForm.deduction || 0)
  );
  const computedRemaining = Math.max(0, computedNetSalary - Number(salaryForm.paid_amount || 0));

  const openCreateSalary = () => {
    setEditingSalary(null);
    const firstTeacher = teachers[0];
    setSalaryForm({
      teacher_id: firstTeacher ? String(firstTeacher.id) : '',
      salary_month: new Date().toISOString().slice(0, 7),
      basic_salary: firstTeacher ? Number(firstTeacher.basic_salary) : 4500,
      bonus: 200,
      deduction: 50,
      paid_amount: 0,
      payment_method: 'Bank',
      notes: '',
    });
    setSalaryModalOpen(true);
  };

  const openEditSalary = (sal: any) => {
    setEditingSalary(sal);
    setSalaryForm({
      teacher_id: String(sal.teacher_id),
      salary_month: sal.salary_month,
      basic_salary: sal.basic_salary,
      bonus: sal.bonus,
      deduction: sal.deduction,
      paid_amount: sal.paid_amount,
      payment_method: sal.payment_method || 'Bank',
      notes: sal.notes || '',
    });
    setSalaryModalOpen(true);
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSalary) {
        const res = await apiRequest(`/api/teacher-salaries/${editingSalary.id}`, {
          method: 'PUT',
          body: JSON.stringify(salaryForm),
        });
        showToast(res.message || 'Salary record updated successfully', 'success');
      } else {
        const res = await apiRequest('/api/teacher-salaries', {
          method: 'POST',
          body: JSON.stringify(salaryForm),
        });
        showToast(res.message || 'Salary record created successfully', 'success');
      }
      setSalaryModalOpen(false);
      fetchSalaries();
    } catch (err: any) {
      showToast(err.message || 'Unable to save salary record', 'error');
    }
  };

  const openPayModal = (sal: any) => {
    setPayTarget(sal);
    setPayForm({
      amount: sal.remaining_salary,
      payment_method: 'Bank',
      payment_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
  };

  const handleRecordSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    try {
      const res = await apiRequest(`/api/teacher-salaries/${payTarget.id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payForm),
      });
      showToast(res.message || 'Salary payment successful', 'success');
      setPayTarget(null);
      fetchSalaries();
    } catch (err: any) {
      showToast(err.message || 'Unable to record salary payment', 'error');
    }
  };

  const handleDeleteSalary = async (id: number) => {
    try {
      const res = await apiRequest(`/api/teacher-salaries/${id}`, { method: 'DELETE' });
      showToast(res.message || 'Salary record deleted successfully', 'success');
      fetchSalaries();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete salary record', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Teacher Salary & Payroll Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated Net Salary calculation (Basic + Bonus − Deduction), payroll disbursements, and
            official salary slips.
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => {
              exportToCsv('pinkedu_monthly_salary_report', salaries);
              showToast('Monthly salary report exported to CSV', 'success');
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-600" />
            <span>Monthly Salary Report</span>
          </button>
          {canManagePayroll && (
            <button
              onClick={openCreateSalary}
              className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Salary Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Net Payroll</p>
          <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            ${summary.totalNetPayroll.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Disbursed Salaries</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
            ${summary.totalDisbursed.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Salaries</p>
          <p className="text-2xl font-bold font-mono text-amber-600 tabular-nums mt-1">
            ${summary.totalPending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher name, employee ID, slip number..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-pink-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {['', 'Paid', 'Partial', 'Pending'].map((st) => (
              <button
                key={st || 'all'}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st || 'All Payroll'}
              </button>
            ))}
          </div>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* Salaries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Teacher & Slip</th>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Basic / +Bonus / −Ded.</th>
                <th className="py-3 px-4 text-right">Net Salary</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading payroll records...
                  </td>
                </tr>
              ) : salaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No salary slips match your filter criteria.
                  </td>
                </tr>
              ) : (
                salaries.map((sal) => (
                  <tr key={sal.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{sal.teacher_name}</p>
                      <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                        {sal.slip_number} · {sal.employee_id}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                      {sal.salary_month}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                      ${sal.basic_salary} · +${sal.bonus} · −${sal.deduction}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${Number(sal.net_salary).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      ${Number(sal.paid_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-amber-600 tabular-nums">
                      ${Number(sal.remaining_salary).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          sal.status === 'Paid'
                            ? 'text-emerald-700'
                            : sal.status === 'Partial'
                              ? 'text-amber-600'
                              : 'text-rose-600'
                        }`}
                      >
                        {sal.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="inline-flex items-center gap-1">
                        {canManagePayroll && sal.remaining_salary > 0 && (
                          <button
                            onClick={() => openPayModal(sal)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-md flex items-center gap-1 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Disburse</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSlipTarget(sal)}
                          className="p-1.5 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-md cursor-pointer"
                          title="Print Salary Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canManagePayroll && (
                          <button
                            onClick={() => openEditSalary(sal)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSalary(sal.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Salary Modal */}
      {salaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingSalary ? 'Edit Salary Slip' : 'Create Faculty Salary Slip'}
                </h3>
                <p className="text-xs text-slate-500">
                  Net Salary = Basic Salary + Bonus − Deduction
                </p>
              </div>
              <button onClick={() => setSalaryModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teacher *</label>
                  <select
                    required
                    disabled={Boolean(editingSalary)}
                    value={salaryForm.teacher_id}
                    onChange={(e) => {
                      const t = teachers.find((x) => String(x.id) === e.target.value);
                      setSalaryForm({
                        ...salaryForm,
                        teacher_id: e.target.value,
                        basic_salary: t ? Number(t.basic_salary) : salaryForm.basic_salary,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teacher_name} ({t.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salary Month *</label>
                  <input
                    type="month"
                    required
                    disabled={Boolean(editingSalary)}
                    value={salaryForm.salary_month}
                    onChange={(e) => setSalaryForm({ ...salaryForm, salary_month: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Basic Salary ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryForm.basic_salary}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, basic_salary: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bonus ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={salaryForm.bonus}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, bonus: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deduction ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={salaryForm.deduction}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, deduction: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {!editingSalary && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Initial Paid Amount ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={computedNetSalary}
                      value={salaryForm.paid_amount}
                      onChange={(e) =>
                        setSalaryForm({ ...salaryForm, paid_amount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={salaryForm.payment_method}
                      onChange={(e) =>
                        setSalaryForm({ ...salaryForm, payment_method: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Bank">Bank</option>
                      <option value="Online">Online</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between font-mono tabular-nums">
                <span>
                  Net Salary: <strong className="text-slate-900">${computedNetSalary}</strong>
                </span>
                <span>
                  Remaining: <strong className="text-amber-600">${computedRemaining}</strong>
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={salaryForm.notes}
                  onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSalaryModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  Save Salary Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Salary Payment Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Salary Disbursement</h3>
                <p className="text-xs text-slate-500">
                  {payTarget.teacher_name} · {payTarget.slip_number}
                </p>
              </div>
              <button onClick={() => setPayTarget(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSalaryPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Disbursement Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={payTarget.remaining_salary}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Method *</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Bank">Bank</option>
                    <option value="Online">Online</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Salary Slip Modal */}
      {slipTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    PinkEdu Faculty Salary Slip
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    Slip: {slipTarget.slip_number} · Period: {slipTarget.salary_month}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  onClick={triggerPrintDocument}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSlipTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500">Faculty Member:</p>
                <p className="font-bold text-slate-900">{slipTarget.teacher_name}</p>
                <p className="font-mono text-slate-600">{slipTarget.employee_id}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Specialization & Status:</p>
                <p className="font-semibold text-slate-800">
                  {slipTarget.subject_specialization || 'Faculty'}
                </p>
                <p className="font-semibold text-pink-700">{slipTarget.status}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Payroll Component</th>
                    <th className="py-2 px-3 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  <tr>
                    <td className="py-2 px-3 font-sans">Basic Monthly Salary</td>
                    <td className="py-2 px-3 text-right">${slipTarget.basic_salary}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-emerald-700">Add: Performance Bonus</td>
                    <td className="py-2 px-3 text-right text-emerald-700">+${slipTarget.bonus}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-rose-600">Less: Deductions / Tax</td>
                    <td className="py-2 px-3 text-right text-rose-600">
                      −${slipTarget.deduction}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className="py-2.5 px-3 font-sans">Net Payable Salary</td>
                    <td className="py-2.5 px-3 text-right">${slipTarget.net_salary}</td>
                  </tr>
                  <tr className="text-emerald-700 font-semibold">
                    <td className="py-2 px-3 font-sans">Disbursed Amount</td>
                    <td className="py-2 px-3 text-right">${slipTarget.paid_amount}</td>
                  </tr>
                  <tr className="text-amber-600 font-semibold">
                    <td className="py-2 px-3 font-sans">Remaining Balance</td>
                    <td className="py-2 px-3 text-right">${slipTarget.remaining_salary}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
