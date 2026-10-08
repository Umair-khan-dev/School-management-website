import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportToCsv, triggerPrintDocument } from '../utils/exportUtils';
import {
  Search,
  Plus,
  Download,
  CreditCard,
  Receipt,
  Printer,
  Edit2,
  Trash2,
  X,
  GraduationCap,
} from 'lucide-react';

export const FeesModule: React.FC = () => {
  const { user, showToast } = useAuth();
  const canManageFees = user?.role === 'Admin' || user?.role === 'Accountant';

  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalPending: 0,
    paidCount: 0,
    partialCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Create / Edit Fee Modal
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [feeForm, setFeeForm] = useState({
    student_id: '',
    fee_month: new Date().toISOString().slice(0, 7),
    tuition_fee: 850,
    admission_fee: 0,
    transport_fee: 120,
    exam_fee: 60,
    other_fee: 20,
    discount: 0,
    paid_amount: 0,
    due_date: `${new Date().toISOString().slice(0, 7)}-28`,
    payment_method: 'Online',
    notes: '',
  });

  // Record Payment Modal
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: 0,
    payment_method: 'Cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_no: '',
    notes: '',
  });

  // Receipt Modal
  const [receiptTarget, setReceiptTarget] = useState<any | null>(null);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const [feeRes, stuRes] = await Promise.all([
        apiRequest('/api/student-fees', {
          params: {
            search,
            status: statusFilter,
            class_name: classFilter,
            fee_month: monthFilter,
          },
        }),
        apiRequest('/api/students', { params: { limit: 100 } }),
      ]);
      setFees(feeRes.fees || []);
      setSummary(
        feeRes.summary || {
          totalBilled: 0,
          totalCollected: 0,
          totalPending: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
        }
      );
      setStudents(stuRes.students || []);
    } catch (err: any) {
      showToast(err.message || 'Unable to fetch fee records', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, classFilter, monthFilter, showToast]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  // Automatic calculation: Total = Tuition + Admission + Transport + Exam + Other - Discount
  const computedTotal = Math.max(
    0,
    Number(feeForm.tuition_fee || 0) +
      Number(feeForm.admission_fee || 0) +
      Number(feeForm.transport_fee || 0) +
      Number(feeForm.exam_fee || 0) +
      Number(feeForm.other_fee || 0) -
      Number(feeForm.discount || 0)
  );
  const computedRemaining = Math.max(0, computedTotal - Number(feeForm.paid_amount || 0));

  const openCreateFeeModal = () => {
    setEditingFee(null);
    setFeeForm({
      student_id: students[0]?.id ? String(students[0].id) : '',
      fee_month: new Date().toISOString().slice(0, 7),
      tuition_fee: 850,
      admission_fee: 0,
      transport_fee: 120,
      exam_fee: 60,
      other_fee: 20,
      discount: 0,
      paid_amount: 0,
      due_date: `${new Date().toISOString().slice(0, 7)}-28`,
      payment_method: 'Online',
      notes: '',
    });
    setFeeModalOpen(true);
  };

  const openEditFeeModal = (f: any) => {
    setEditingFee(f);
    setFeeForm({
      student_id: String(f.student_id),
      fee_month: f.fee_month,
      tuition_fee: f.tuition_fee,
      admission_fee: f.admission_fee,
      transport_fee: f.transport_fee,
      exam_fee: f.exam_fee,
      other_fee: f.other_fee,
      discount: f.discount,
      paid_amount: f.paid_amount,
      due_date: f.due_date,
      payment_method: f.payment_method || 'Cash',
      notes: f.notes || '',
    });
    setFeeModalOpen(true);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFee) {
        const res = await apiRequest(`/api/student-fees/${editingFee.id}`, {
          method: 'PUT',
          body: JSON.stringify(feeForm),
        });
        showToast(res.message || 'Fee record updated successfully', 'success');
      } else {
        const res = await apiRequest('/api/student-fees', {
          method: 'POST',
          body: JSON.stringify(feeForm),
        });
        showToast(res.message || 'Fee invoice created successfully', 'success');
      }
      setFeeModalOpen(false);
      fetchFees();
    } catch (err: any) {
      showToast(err.message || 'Unable to save fee invoice', 'error');
    }
  };

  const openPaymentModal = (f: any) => {
    setPaymentTarget(f);
    setPayForm({
      amount: f.remaining_amount,
      payment_method: 'Cash',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_no: `TXN-${Date.now().toString().slice(-6)}`,
      notes: '',
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    try {
      const res = await apiRequest(`/api/student-fees/${paymentTarget.id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payForm),
      });
      showToast(res.message || 'Fee payment recorded successfully', 'success');
      setPaymentTarget(null);
      fetchFees();
    } catch (err: any) {
      showToast(err.message || 'Unable to record payment', 'error');
    }
  };

  const handleDeleteFee = async (id: number) => {
    try {
      const res = await apiRequest(`/api/student-fees/${id}`, { method: 'DELETE' });
      showToast(res.message || 'Fee invoice deleted successfully', 'success');
      fetchFees();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete fee record', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Fees & Billing Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated tuition calculation, installment collection, pending fee tracking, and official
            receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => {
              exportToCsv('pinkedu_monthly_fee_report', fees);
              showToast('Monthly fee report exported to CSV', 'success');
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-600" />
            <span>Monthly Fee Report</span>
          </button>
          {canManageFees && (
            <button
              onClick={openCreateFeeModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Fee Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Billed</p>
          <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            ${summary.totalBilled.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Fees Collected</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
            ${summary.totalCollected.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Fees Balance</p>
          <p className="text-2xl font-bold font-mono text-rose-600 tabular-nums mt-1">
            ${summary.totalPending.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Invoice Statuses</p>
          <p className="text-xs font-mono text-slate-700 tabular-nums mt-2">
            Paid: {summary.paidCount} · Partial: {summary.partialCount} · Pending:{' '}
            {summary.pendingCount}
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
            placeholder="Search student name, ID, invoice number..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-pink-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Status Filter Buttons */}
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
                {st || 'All Fees'}
              </button>
            ))}
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Classes</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 7">Grade 7</option>
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* Fee Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Invoice & Student</th>
                <th className="py-3 px-4">Class & Month</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Due Date & Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading fee records...
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No student fee invoices match your filter criteria.
                  </td>
                </tr>
              ) : (
                fees.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{f.student_name}</p>
                      <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                        {f.invoice_number} · {f.student_code}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800 font-medium">{f.class_name}</p>
                      <p className="font-mono text-slate-500 tabular-nums mt-0.5">{f.fee_month}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ${Number(f.total_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      ${Number(f.paid_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 tabular-nums">
                      ${Number(f.remaining_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-slate-700 tabular-nums">Due: {f.due_date}</p>
                      <p className="text-slate-500 mt-0.5">
                        {f.payment_method ? `Via ${f.payment_method} (${f.payment_date})` : 'Unpaid'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          f.status === 'Paid'
                            ? 'text-emerald-700'
                            : f.status === 'Partial'
                              ? 'text-amber-600'
                              : 'text-rose-600'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="inline-flex items-center gap-1">
                        {canManageFees && f.remaining_amount > 0 && (
                          <button
                            onClick={() => openPaymentModal(f)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-md flex items-center gap-1 cursor-pointer"
                            title="Record Fee Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        )}
                        <button
                          onClick={() => setReceiptTarget(f)}
                          className="p-1.5 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-md cursor-pointer"
                          title="Generate / Print Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        {canManageFees && (
                          <>
                            <button
                              onClick={() => openEditFeeModal(f)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Edit Fee Breakdown"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFee(f.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                              title="Delete Fee Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Create / Edit Fee Invoice Modal */}
      {feeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingFee ? 'Update Fee Invoice' : 'Create Student Fee Invoice'}
                </h3>
                <p className="text-xs text-slate-500">
                  Total = Tuition + Admission + Transport + Exam + Other − Discount
                </p>
              </div>
              <button onClick={() => setFeeModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
                  <select
                    required
                    disabled={Boolean(editingFee)}
                    value={feeForm.student_id}
                    onChange={(e) => setFeeForm({ ...feeForm, student_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.student_name} ({s.student_id} · {s.class_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fee Month *</label>
                  <input
                    type="month"
                    required
                    disabled={Boolean(editingFee)}
                    value={feeForm.fee_month}
                    onChange={(e) => setFeeForm({ ...feeForm, fee_month: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tuition Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={feeForm.tuition_fee}
                    onChange={(e) =>
                      setFeeForm({ ...feeForm, tuition_fee: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={feeForm.admission_fee}
                    onChange={(e) =>
                      setFeeForm({ ...feeForm, admission_fee: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Transport Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={feeForm.transport_fee}
                    onChange={(e) =>
                      setFeeForm({ ...feeForm, transport_fee: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={feeForm.exam_fee}
                    onChange={(e) => setFeeForm({ ...feeForm, exam_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Other Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={feeForm.other_fee}
                    onChange={(e) => setFeeForm({ ...feeForm, other_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={feeForm.discount}
                    onChange={(e) => setFeeForm({ ...feeForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                {!editingFee && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Initial Paid Amount ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={computedTotal}
                        value={feeForm.paid_amount}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, paid_amount: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={feeForm.payment_method}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, payment_method: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={feeForm.due_date}
                    onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Automatic Live Formula Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 font-mono tabular-nums">
                <div>
                  <span className="text-slate-500">Calculated Total: </span>
                  <span className="font-bold text-slate-900">${computedTotal}</span>
                </div>
                <div>
                  <span className="text-slate-500">Paid: </span>
                  <span className="font-bold text-emerald-700">${feeForm.paid_amount}</span>
                </div>
                <div>
                  <span className="text-slate-500">Remaining Balance: </span>
                  <span className="font-bold text-rose-600">${computedRemaining}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={feeForm.notes}
                  onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                  placeholder="Optional billing or scholarship note..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFeeModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  {editingFee ? 'Save Changes' : 'Generate Fee Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Fee Payment Modal */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Fee Payment</h3>
                <p className="text-xs text-slate-500">
                  {paymentTarget.student_name} · {paymentTarget.invoice_number}
                </p>
              </div>
              <button onClick={() => setPaymentTarget(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-lg text-xs font-mono tabular-nums flex justify-between">
              <span>Total: ${paymentTarget.total_amount}</span>
              <span>Paid: ${paymentTarget.paid_amount}</span>
              <span className="font-bold text-rose-600">
                Due: ${paymentTarget.remaining_amount}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={paymentTarget.remaining_amount}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction / Reference No
                </label>
                <input
                  type="text"
                  value={payForm.reference_no}
                  onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
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
                  onClick={() => setPaymentTarget(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  Confirm Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Fee Receipt Modal */}
      {receiptTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    PinkEdu Official Fee Receipt
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    Invoice: {receiptTarget.invoice_number} · Month: {receiptTarget.fee_month}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  onClick={triggerPrintDocument}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setReceiptTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500">Student Name:</p>
                <p className="font-bold text-slate-900">{receiptTarget.student_name}</p>
                <p className="font-mono text-slate-600">{receiptTarget.student_code}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Class & Status:</p>
                <p className="font-bold text-slate-900">{receiptTarget.class_name}</p>
                <p className="font-semibold text-pink-700">{receiptTarget.status}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Fee Head</th>
                    <th className="py-2 px-3 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  <tr>
                    <td className="py-2 px-3 font-sans">Tuition Fee</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.tuition_fee}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans">Admission Fee</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.admission_fee}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans">Transport Fee</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.transport_fee}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans">Examination Fee</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.exam_fee}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans">Other Institutional Charges</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.other_fee}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-emerald-700">Less: Discount</td>
                    <td className="py-2 px-3 text-right text-emerald-700">
                      −${receiptTarget.discount}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className="py-2.5 px-3 font-sans">Net Payable Total</td>
                    <td className="py-2.5 px-3 text-right">${receiptTarget.total_amount}</td>
                  </tr>
                  <tr className="text-emerald-700 font-semibold">
                    <td className="py-2 px-3 font-sans">Total Amount Paid</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.paid_amount}</td>
                  </tr>
                  <tr className="text-rose-600 font-semibold">
                    <td className="py-2 px-3 font-sans">Remaining Balance Due</td>
                    <td className="py-2 px-3 text-right">${receiptTarget.remaining_amount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {receiptTarget.payments && receiptTarget.payments.length > 0 && (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-800">Recorded Payment Transactions:</p>
                {receiptTarget.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between font-mono text-slate-600 py-1 border-b border-slate-100"
                  >
                    <span>
                      {p.receipt_number} · {p.payment_date} · {p.payment_method}
                    </span>
                    <span className="font-semibold text-emerald-700">${p.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
