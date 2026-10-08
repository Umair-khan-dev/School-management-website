import { Response } from 'express';
import { db } from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const getReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      search = '',
      class_name = '',
      status = '',
      startDate = '',
      endDate = '',
    } = req.query as Record<string, string>;

    const q = search.trim().toLowerCase();

    // 1. Student Reports
    let studentRecords = [...store.students];
    if (q) {
      studentRecords = studentRecords.filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          s.student_id.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q) ||
          s.class_name.toLowerCase().includes(q)
      );
    }
    if (class_name) {
      studentRecords = studentRecords.filter((s) => s.class_name === class_name);
    }
    if (status) {
      studentRecords = studentRecords.filter((s) => s.status === status);
    }
    if (startDate) {
      studentRecords = studentRecords.filter((s) => s.admission_date >= startDate);
    }
    if (endDate) {
      studentRecords = studentRecords.filter((s) => s.admission_date <= endDate);
    }

    // 2. Attendance Reports (Student + Teacher)
    let studentAttendanceReport = store.student_attendance.map((a) => {
      const stu = store.students.find((s) => s.id === a.student_id);
      return {
        ...a,
        student_name: stu?.student_name || 'Unknown Student',
        student_code: stu?.student_id || '',
        roll_number: stu?.roll_number || '',
      };
    });

    if (q) {
      studentAttendanceReport = studentAttendanceReport.filter(
        (a) =>
          a.student_name.toLowerCase().includes(q) ||
          a.student_code.toLowerCase().includes(q) ||
          a.class_name.toLowerCase().includes(q)
      );
    }
    if (class_name) {
      studentAttendanceReport = studentAttendanceReport.filter((a) => a.class_name === class_name);
    }
    if (status) {
      studentAttendanceReport = studentAttendanceReport.filter((a) => a.status === status);
    }
    if (startDate) {
      studentAttendanceReport = studentAttendanceReport.filter(
        (a) => a.attendance_date >= startDate
      );
    }
    if (endDate) {
      studentAttendanceReport = studentAttendanceReport.filter((a) => a.attendance_date <= endDate);
    }

    let teacherAttendanceReport = store.teacher_attendance.map((a) => {
      const t = store.teachers.find((tch) => tch.id === a.teacher_id);
      return {
        ...a,
        teacher_name: t?.teacher_name || 'Unknown Teacher',
        employee_id: t?.employee_id || '',
        subject_specialization: t?.subject_specialization || '',
      };
    });

    if (q) {
      teacherAttendanceReport = teacherAttendanceReport.filter(
        (a) =>
          a.teacher_name.toLowerCase().includes(q) ||
          a.employee_id.toLowerCase().includes(q)
      );
    }
    if (startDate) {
      teacherAttendanceReport = teacherAttendanceReport.filter(
        (a) => a.attendance_date >= startDate
      );
    }
    if (endDate) {
      teacherAttendanceReport = teacherAttendanceReport.filter((a) => a.attendance_date <= endDate);
    }

    // 3. Financial Reports
    let feeReport = store.student_fees.map((f) => {
      const stu = store.students.find((s) => s.id === f.student_id);
      return {
        ...f,
        student_name: stu?.student_name || 'Unknown Student',
        student_code: stu?.student_id || '',
      };
    });

    if (q) {
      feeReport = feeReport.filter(
        (f) =>
          f.student_name.toLowerCase().includes(q) ||
          f.invoice_number.toLowerCase().includes(q) ||
          f.class_name.toLowerCase().includes(q)
      );
    }
    if (class_name) {
      feeReport = feeReport.filter((f) => f.class_name === class_name);
    }
    if (status) {
      feeReport = feeReport.filter((f) => f.status === status);
    }
    if (startDate) {
      feeReport = feeReport.filter((f) => f.due_date >= startDate);
    }
    if (endDate) {
      feeReport = feeReport.filter((f) => f.due_date <= endDate);
    }

    let salaryReport = store.teacher_salaries.map((s) => {
      const t = store.teachers.find((tch) => tch.id === s.teacher_id);
      return {
        ...s,
        teacher_name: t?.teacher_name || 'Unknown Teacher',
        subject_specialization: t?.subject_specialization || '',
      };
    });

    if (q) {
      salaryReport = salaryReport.filter(
        (s) =>
          s.teacher_name.toLowerCase().includes(q) ||
          s.employee_id.toLowerCase().includes(q) ||
          s.slip_number.toLowerCase().includes(q)
      );
    }
    if (status) {
      salaryReport = salaryReport.filter((s) => s.status === status);
    }

    const totalFeeBilled = feeReport.reduce((s, f) => s + Number(f.total_amount), 0);
    const totalFeeCollected = feeReport.reduce((s, f) => s + Number(f.paid_amount), 0);
    const totalPendingFees = feeReport.reduce((s, f) => s + Number(f.remaining_amount), 0);

    const totalSalaryPayroll = salaryReport.reduce((s, r) => s + Number(r.net_salary), 0);
    const totalSalaryPaid = salaryReport.reduce((s, r) => s + Number(r.paid_amount), 0);
    const totalPendingSalaries = salaryReport.reduce((s, r) => s + Number(r.remaining_salary), 0);

    const netFinancialPosition = totalFeeCollected - totalSalaryPaid;

    return res.json({
      success: true,
      students: {
        records: studentRecords,
        totalCount: studentRecords.length,
        activeCount: studentRecords.filter((s) => s.status === 'Active').length,
        inactiveCount: studentRecords.filter((s) => s.status !== 'Active').length,
      },
      attendance: {
        studentRecords: studentAttendanceReport,
        teacherRecords: teacherAttendanceReport,
        absentStudents: studentAttendanceReport.filter((a) => a.status === 'Absent'),
      },
      finance: {
        feeRecords: feeReport,
        salaryRecords: salaryReport,
        summary: {
          totalFeeBilled,
          totalFeeCollected,
          totalPendingFees,
          totalSalaryPayroll,
          totalSalaryPaid,
          totalPendingSalaries,
          netFinancialPosition,
        },
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to generate reports.',
    });
  }
};

