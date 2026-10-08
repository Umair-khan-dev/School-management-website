import { Response } from 'express';
import {
  db,
  getTodayDateString,
  PaymentMethod,
  PaymentStatus,
  StudentFeeRow,
  FeePaymentRow,
  TeacherSalaryRow,
  SalaryPaymentRow,
} from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

// ============================================================================
// Student Fees Management
// Automatically calculates:
// Total = Tuition + Admission + Transport + Exam + Other - Discount
// Remaining = Total Amount - Paid Amount
// ============================================================================

export const getStudentFees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      search = '',
      class_name = '',
      status = '',
      fee_month = '',
    } = req.query as Record<string, string>;

    let fees = store.student_fees.map((f) => {
      const stu = store.students.find((s) => s.id === f.student_id);
      const payments = store.fee_payments.filter((p) => p.fee_id === f.id);
      return {
        ...f,
        student_name: stu?.student_name || 'Unknown Student',
        student_code: stu?.student_id || '',
        admission_number: stu?.admission_number || '',
        roll_number: stu?.roll_number || '',
        section: stu?.section || '',
        father_name: stu?.father_name || '',
        phone: stu?.phone || '',
        payments,
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      fees = fees.filter(
        (f) =>
          f.student_name.toLowerCase().includes(q) ||
          f.student_code.toLowerCase().includes(q) ||
          f.invoice_number.toLowerCase().includes(q) ||
          f.class_name.toLowerCase().includes(q)
      );
    }

    if (class_name) {
      fees = fees.filter((f) => f.class_name === class_name);
    }
    if (status) {
      fees = fees.filter((f) => f.status === status);
    }
    if (fee_month) {
      fees = fees.filter((f) => f.fee_month === fee_month);
    }

    fees.sort((a, b) => b.fee_month.localeCompare(a.fee_month) || b.id - a.id);

    const summary = {
      totalBilled: fees.reduce((s, f) => s + Number(f.total_amount), 0),
      totalCollected: fees.reduce((s, f) => s + Number(f.paid_amount), 0),
      totalPending: fees.reduce((s, f) => s + Number(f.remaining_amount), 0),
      paidCount: fees.filter((f) => f.status === 'Paid').length,
      partialCount: fees.filter((f) => f.status === 'Partial').length,
      pendingCount: fees.filter((f) => f.status === 'Pending').length,
    };

    return res.json({
      success: true,
      fees,
      summary,
    });
  } catch (error) {
    console.error('Get student fees error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch student fee records.',
    });
  }
};

export const createStudentFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      student_id,
      fee_month,
      tuition_fee = 0,
      admission_fee = 0,
      transport_fee = 0,
      exam_fee = 0,
      other_fee = 0,
      discount = 0,
      paid_amount = 0,
      due_date,
      payment_date,
      payment_method,
      notes,
    } = req.body;

    if (!student_id || !fee_month || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Student, Fee Month, and Due Date are required.',
      });
    }

    const stu = store.students.find((s) => s.id === Number(student_id));
    if (!stu) {
      return res.status(404).json({
        success: false,
        message: 'Selected student not found.',
      });
    }

    const duplicate = store.student_fees.some(
      (f) => f.student_id === stu.id && f.fee_month === String(fee_month).trim()
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Fee record for ${stu.student_name} in ${fee_month} already exists.`,
      });
    }

    const tuition = Number(tuition_fee) || 0;
    const admission = Number(admission_fee) || 0;
    const transport = Number(transport_fee) || 0;
    const exam = Number(exam_fee) || 0;
    const other = Number(other_fee) || 0;
    const disc = Number(discount) || 0;

    // Formula: Total = Tuition + Admission + Transport + Exam + Other - Discount
    const totalAmount = Math.max(0, tuition + admission + transport + exam + other - disc);
    const paidAmt = Math.min(totalAmount, Math.max(0, Number(paid_amount) || 0));
    const remainingAmount = Math.max(0, totalAmount - paidAmt);

    let status: PaymentStatus = 'Pending';
    if (remainingAmount === 0 && totalAmount > 0) status = 'Paid';
    else if (paidAmt > 0 && remainingAmount > 0) status = 'Partial';

    const nowIso = new Date().toISOString();
    const nextId = db.nextId('student_fees');
    const invoiceNumber = `INV-${String(fee_month).replace('-', '')}-${String(100 + nextId)}`;

    const newFee: StudentFeeRow = {
      id: nextId,
      invoice_number: invoiceNumber,
      student_id: stu.id,
      class_name: stu.class_name,
      fee_month: String(fee_month).trim(),
      tuition_fee: tuition,
      admission_fee: admission,
      transport_fee: transport,
      exam_fee: exam,
      other_fee: other,
      discount: disc,
      total_amount: totalAmount,
      paid_amount: paidAmt,
      remaining_amount: remainingAmount,
      due_date: String(due_date),
      payment_date: paidAmt > 0 ? payment_date || getTodayDateString() : null,
      payment_method: paidAmt > 0 ? (payment_method as PaymentMethod) || 'Cash' : null,
      status,
      notes: notes ? String(notes).trim() : '',
      created_at: nowIso,
      updated_at: nowIso,
    };

    await db.transaction((s) => {
      s.student_fees.push(newFee);
      if (paidAmt > 0) {
        const payId = db.nextId('fee_payments');
        const newPayment: FeePaymentRow = {
          id: payId,
          receipt_number: `RCP-2026-${String(5000 + payId)}`,
          fee_id: newFee.id,
          student_id: stu.id,
          amount: paidAmt,
          payment_date: newFee.payment_date || getTodayDateString(),
          payment_method: newFee.payment_method || 'Cash',
          reference_no: `INIT-${payId}`,
          notes: notes ? String(notes).trim() : 'Initial payment upon invoice creation',
          received_by: req.user?.id || 1,
          created_at: nowIso,
        };
        s.fee_payments.push(newPayment);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Fee invoice created successfully',
      fee: newFee,
    });
  } catch (error) {
    console.error('Create student fee error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create student fee record.',
    });
  }
};

export const recordFeePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feeId = Number(req.params.id);
    const { amount, payment_method = 'Cash', payment_date, reference_no = '', notes = '' } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid payment amount greater than zero.',
      });
    }

    const store = db.getStore();
    const fee = store.student_fees.find((f) => f.id === feeId);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee invoice not found.',
      });
    }

    if (fee.remaining_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This fee invoice is already paid in full.',
      });
    }

    const appliedAmount = Math.min(fee.remaining_amount, payAmount);
    const nowIso = new Date().toISOString();
    let createdReceipt: FeePaymentRow | null = null;

    await db.transaction((s) => {
      const targetFee = s.student_fees.find((f) => f.id === feeId)!;
      const resolvedPayDate: string = payment_date || getTodayDateString();
      targetFee.paid_amount = Number(targetFee.paid_amount) + appliedAmount;
      targetFee.remaining_amount = Math.max(0, Number(targetFee.total_amount) - targetFee.paid_amount);
      targetFee.payment_date = resolvedPayDate;
      targetFee.payment_method = payment_method as PaymentMethod;
      targetFee.status = targetFee.remaining_amount === 0 ? 'Paid' : 'Partial';
      if (notes) targetFee.notes = String(notes).trim();
      targetFee.updated_at = nowIso;

      const payId = db.nextId('fee_payments');
      const newReceipt: FeePaymentRow = {
        id: payId,
        receipt_number: `RCP-2026-${String(5000 + payId)}`,
        fee_id: targetFee.id,
        student_id: targetFee.student_id,
        amount: appliedAmount,
        payment_date: resolvedPayDate,
        payment_method: payment_method as PaymentMethod,
        reference_no: reference_no || `REF-${Date.now().toString().slice(-6)}`,
        notes: notes || `Payment towards invoice ${targetFee.invoice_number}`,
        received_by: req.user?.id || 1,
        created_at: nowIso,
      };
      createdReceipt = newReceipt;
      s.fee_payments.push(newReceipt);
    });

    return res.json({
      success: true,
      message: 'Fee payment recorded successfully',
      fee,
      receipt: createdReceipt,
    });
  } catch (error) {
    console.error('Record fee payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to record fee payment.',
    });
  }
};

export const updateStudentFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const fee = store.student_fees.find((f) => f.id === id);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee invoice not found.' });
    }

    const {
      tuition_fee,
      admission_fee,
      transport_fee,
      exam_fee,
      other_fee,
      discount,
      due_date,
      notes,
    } = req.body;

    if (tuition_fee !== undefined) fee.tuition_fee = Number(tuition_fee) || 0;
    if (admission_fee !== undefined) fee.admission_fee = Number(admission_fee) || 0;
    if (transport_fee !== undefined) fee.transport_fee = Number(transport_fee) || 0;
    if (exam_fee !== undefined) fee.exam_fee = Number(exam_fee) || 0;
    if (other_fee !== undefined) fee.other_fee = Number(other_fee) || 0;
    if (discount !== undefined) fee.discount = Number(discount) || 0;
    if (due_date !== undefined) fee.due_date = String(due_date);
    if (notes !== undefined) fee.notes = String(notes);

    fee.total_amount = Math.max(
      0,
      fee.tuition_fee +
        fee.admission_fee +
        fee.transport_fee +
        fee.exam_fee +
        fee.other_fee -
        fee.discount
    );
    fee.remaining_amount = Math.max(0, fee.total_amount - fee.paid_amount);
    fee.status =
      fee.remaining_amount === 0 ? 'Paid' : fee.paid_amount > 0 ? 'Partial' : 'Pending';
    fee.updated_at = new Date().toISOString();

    await db.commit();
    return res.json({
      success: true,
      message: 'Fee record updated successfully',
      fee,
    });
  } catch (error) {
    console.error('Update student fee error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update fee record.' });
  }
};

export const deleteStudentFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const idx = store.student_fees.findIndex((f) => f.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Fee invoice not found.' });
    }
    await db.transaction((s) => {
      s.student_fees.splice(idx, 1);
      s.fee_payments = s.fee_payments.filter((p) => p.fee_id !== id);
    });
    return res.json({
      success: true,
      message: 'Fee invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete student fee error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete fee record.' });
  }
};

// ============================================================================
// Teacher Salary Management
// Automatically calculates:
// Net Salary = Basic Salary + Bonus - Deduction
// Remaining Salary = Net Salary - Paid Amount
// ============================================================================

export const getTeacherSalaries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const { search = '', status = '', salary_month = '' } = req.query as Record<string, string>;

    let salaries = store.teacher_salaries.map((sal) => {
      const teacher = store.teachers.find((t) => t.id === sal.teacher_id);
      const payments = store.salary_payments.filter((p) => p.salary_id === sal.id);
      return {
        ...sal,
        teacher_name: teacher?.teacher_name || 'Unknown Teacher',
        subject_specialization: teacher?.subject_specialization || '',
        qualification: teacher?.qualification || '',
        phone: teacher?.phone || '',
        payments,
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      salaries = salaries.filter(
        (s) =>
          s.teacher_name.toLowerCase().includes(q) ||
          s.employee_id.toLowerCase().includes(q) ||
          s.slip_number.toLowerCase().includes(q)
      );
    }

    if (status) {
      salaries = salaries.filter((s) => s.status === status);
    }
    if (salary_month) {
      salaries = salaries.filter((s) => s.salary_month === salary_month);
    }

    salaries.sort((a, b) => b.salary_month.localeCompare(a.salary_month) || b.id - a.id);

    const summary = {
      totalNetPayroll: salaries.reduce((s, r) => s + Number(r.net_salary), 0),
      totalDisbursed: salaries.reduce((s, r) => s + Number(r.paid_amount), 0),
      totalPending: salaries.reduce((s, r) => s + Number(r.remaining_salary), 0),
      paidCount: salaries.filter((s) => s.status === 'Paid').length,
      pendingCount: salaries.filter((s) => s.status !== 'Paid').length,
    };

    return res.json({
      success: true,
      salaries,
      summary,
    });
  } catch (error) {
    console.error('Get teacher salaries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch teacher salary records.',
    });
  }
};

export const createTeacherSalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      teacher_id,
      salary_month,
      basic_salary,
      bonus = 0,
      deduction = 0,
      paid_amount = 0,
      payment_date,
      payment_method,
      notes = '',
    } = req.body;

    if (!teacher_id || !salary_month) {
      return res.status(400).json({
        success: false,
        message: 'Teacher and Salary Month are required.',
      });
    }

    const teacher = store.teachers.find((t) => t.id === Number(teacher_id));
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.',
      });
    }

    const exists = store.teacher_salaries.some(
      (s) => s.teacher_id === teacher.id && s.salary_month === String(salary_month).trim()
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Salary record for ${teacher.teacher_name} in ${salary_month} already exists.`,
      });
    }

    const basic = Number(basic_salary ?? teacher.basic_salary) || 0;
    const bon = Number(bonus) || 0;
    const ded = Number(deduction) || 0;
    const netSalary = Math.max(0, basic + bon - ded);
    const paidAmt = Math.min(netSalary, Math.max(0, Number(paid_amount) || 0));
    const remainingSalary = Math.max(0, netSalary - paidAmt);

    let status: PaymentStatus = 'Pending';
    if (remainingSalary === 0 && netSalary > 0) status = 'Paid';
    else if (paidAmt > 0 && remainingSalary > 0) status = 'Partial';

    const nowIso = new Date().toISOString();
    const nextId = db.nextId('teacher_salaries');
    const slipNumber = `SLP-${String(salary_month).replace('-', '')}-${String(100 + nextId)}`;

    const newSalary: TeacherSalaryRow = {
      id: nextId,
      slip_number: slipNumber,
      teacher_id: teacher.id,
      employee_id: teacher.employee_id,
      salary_month: String(salary_month).trim(),
      basic_salary: basic,
      bonus: bon,
      deduction: ded,
      net_salary: netSalary,
      paid_amount: paidAmt,
      remaining_salary: remainingSalary,
      payment_date: paidAmt > 0 ? payment_date || getTodayDateString() : null,
      payment_method: paidAmt > 0 ? (payment_method as PaymentMethod) || 'Bank' : null,
      status,
      notes: String(notes).trim(),
      created_at: nowIso,
      updated_at: nowIso,
    };

    await db.transaction((s) => {
      s.teacher_salaries.push(newSalary);
      if (paidAmt > 0) {
        const vId = db.nextId('salary_payments');
        const paymentRow: SalaryPaymentRow = {
          id: vId,
          voucher_number: `VCH-2026-${String(900 + vId)}`,
          salary_id: newSalary.id,
          teacher_id: teacher.id,
          amount: paidAmt,
          payment_date: newSalary.payment_date || getTodayDateString(),
          payment_method: newSalary.payment_method || 'Bank',
          notes: String(notes).trim() || 'Initial payroll disbursement',
          processed_by: req.user?.id || 1,
          created_at: nowIso,
        };
        s.salary_payments.push(paymentRow);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Salary record created successfully',
      salary: newSalary,
    });
  } catch (error) {
    console.error('Create teacher salary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create salary record.',
    });
  }
};

export const recordSalaryPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const salaryId = Number(req.params.id);
    const { amount, payment_method = 'Bank', payment_date, notes = '' } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid salary payment amount.',
      });
    }

    const store = db.getStore();
    const salary = store.teacher_salaries.find((s) => s.id === salaryId);
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found.',
      });
    }

    if (salary.remaining_salary <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This salary slip is already paid in full.',
      });
    }

    const applied = Math.min(salary.remaining_salary, payAmount);
    const nowIso = new Date().toISOString();

    await db.transaction((s) => {
      const target = s.teacher_salaries.find((sal) => sal.id === salaryId)!;
      const resolvedSalaryPayDate: string = payment_date || getTodayDateString();
      target.paid_amount = Number(target.paid_amount) + applied;
      target.remaining_salary = Math.max(0, Number(target.net_salary) - target.paid_amount);
      target.payment_date = resolvedSalaryPayDate;
      target.payment_method = payment_method as PaymentMethod;
      target.status = target.remaining_salary === 0 ? 'Paid' : 'Partial';
      if (notes) target.notes = String(notes).trim();
      target.updated_at = nowIso;

      const vId = db.nextId('salary_payments');
      s.salary_payments.push({
        id: vId,
        voucher_number: `VCH-2026-${String(900 + vId)}`,
        salary_id: target.id,
        teacher_id: target.teacher_id,
        amount: applied,
        payment_date: resolvedSalaryPayDate,
        payment_method: payment_method as PaymentMethod,
        notes: notes || `Disbursement for ${target.slip_number}`,
        processed_by: req.user?.id || 1,
        created_at: nowIso,
      });
    });

    return res.json({
      success: true,
      message: 'Salary payment successful',
      salary,
    });
  } catch (error) {
    console.error('Record salary payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to record salary payment.',
    });
  }
};

export const updateTeacherSalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const salary = store.teacher_salaries.find((s) => s.id === id);
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found.' });
    }

    const { basic_salary, bonus, deduction, notes } = req.body;
    if (basic_salary !== undefined) salary.basic_salary = Number(basic_salary) || 0;
    if (bonus !== undefined) salary.bonus = Number(bonus) || 0;
    if (deduction !== undefined) salary.deduction = Number(deduction) || 0;
    if (notes !== undefined) salary.notes = String(notes);

    salary.net_salary = Math.max(0, salary.basic_salary + salary.bonus - salary.deduction);
    salary.remaining_salary = Math.max(0, salary.net_salary - salary.paid_amount);
    salary.status =
      salary.remaining_salary === 0 ? 'Paid' : salary.paid_amount > 0 ? 'Partial' : 'Pending';
    salary.updated_at = new Date().toISOString();

    await db.commit();
    return res.json({
      success: true,
      message: 'Salary record updated successfully',
      salary,
    });
  } catch (error) {
    console.error('Update salary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update salary record.' });
  }
};

export const deleteTeacherSalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const idx = store.teacher_salaries.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Salary record not found.' });
    }
    await db.transaction((s) => {
      s.teacher_salaries.splice(idx, 1);
      s.salary_payments = s.salary_payments.filter((p) => p.salary_id !== id);
    });
    return res.json({
      success: true,
      message: 'Salary record deleted successfully',
    });
  } catch (error) {
    console.error('Delete salary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete salary record.' });
  }
};

