import { Response } from 'express';
import { db, getTodayDateString } from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const getDashboardStats = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const today = getTodayDateString();

    // 1. Core KPI Calculations from Relational Store
    const activeStudents = store.students.filter((s) => s.status === 'Active');
    const activeTeachers = store.teachers.filter((t) => t.status === 'Active');
    const activeClasses = store.classes.filter((c) => c.status === 'Active');
    const activeSubjects = store.subjects.filter((s) => s.status === 'Active');

    // Today's Student Attendance
    const todayStuAtt = store.student_attendance.filter((a) => a.attendance_date === today);
    const stuPresent = todayStuAtt.filter((a) => a.status === 'Present').length;
    const stuAbsent = todayStuAtt.filter((a) => a.status === 'Absent').length;
    const stuLate = todayStuAtt.filter((a) => a.status === 'Late').length;
    const stuLeave = todayStuAtt.filter((a) => a.status === 'Leave').length;
    const stuAttTotal = todayStuAtt.length || activeStudents.length || 1;
    const todayStudentAttendancePct = Math.round(((stuPresent + stuLate) / stuAttTotal) * 100);

    // Today's Teacher Attendance
    const todayTchAtt = store.teacher_attendance.filter((a) => a.attendance_date === today);
    const tchPresent = todayTchAtt.filter((a) => a.status === 'Present').length;
    const tchAbsent = todayTchAtt.filter((a) => a.status === 'Absent').length;
    const tchLate = todayTchAtt.filter((a) => a.status === 'Late').length;
    const tchLeave = todayTchAtt.filter((a) => a.status === 'Leave').length;
    const tchAttTotal = todayTchAtt.length || store.teachers.length || 1;
    const todayTeacherAttendancePct = Math.round(((tchPresent + tchLate) / tchAttTotal) * 100);

    // Financial Totals
    const totalFeesCollected = store.student_fees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
    const pendingFees = store.student_fees.reduce(
      (sum, f) => sum + Math.max(0, Number(f.total_amount || 0) - Number(f.paid_amount || 0)),
      0
    );

    const totalSalaries = store.teacher_salaries.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
    const pendingSalaries = store.teacher_salaries.reduce(
      (sum, s) => sum + Math.max(0, Number(s.net_salary || 0) - Number(s.paid_amount || 0)),
      0
    );

    // 2. Analytics Charts Data
    // A. Monthly Student Admissions (Jan to Sep)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const monthlyAdmissions = monthNames.map((label, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const count = store.students.filter((s) => s.admission_date.slice(5, 7) === monthNum).length;
      return { month: label, admissions: count };
    });

    // B. Students by Class
    const classNames = Array.from(new Set(store.classes.map((c) => c.class_name)));
    const studentsByClass = classNames.map((className) => {
      const count = store.students.filter((s) => s.class_name === className).length;
      const male = store.students.filter((s) => s.class_name === className && s.gender === 'Male').length;
      const female = store.students.filter((s) => s.class_name === className && s.gender === 'Female').length;
      return { className, students: count, male, female };
    });

    // C. Male vs Female Students
    const maleCount = store.students.filter((s) => s.gender === 'Male').length;
    const femaleCount = store.students.filter((s) => s.gender === 'Female').length;
    const otherCount = store.students.filter((s) => s.gender === 'Other').length;
    const genderDistribution = [
      { name: 'Female', value: femaleCount },
      { name: 'Male', value: maleCount },
      ...(otherCount > 0 ? [{ name: 'Other', value: otherCount }] : []),
    ];

    // D. Attendance Breakdown (All recorded student attendance)
    const allPresent = store.student_attendance.filter((a) => a.status === 'Present').length;
    const allAbsent = store.student_attendance.filter((a) => a.status === 'Absent').length;
    const allLate = store.student_attendance.filter((a) => a.status === 'Late').length;
    const allLeave = store.student_attendance.filter((a) => a.status === 'Leave').length;
    const attendanceBreakdown = [
      { status: 'Present', count: allPresent },
      { status: 'Absent', count: allAbsent },
      { status: 'Late', count: allLate },
      { status: 'Leave', count: allLeave },
    ];

    // E. Monthly Finance (Fee Collection, Pending Fees, Salary Expenses)
    const financeMonths = Array.from(
      new Set([
        ...store.student_fees.map((f) => f.fee_month),
        ...store.teacher_salaries.map((s) => s.salary_month),
      ])
    ).sort();

    const monthlyFinance = financeMonths.map((ym) => {
      const feesInMonth = store.student_fees.filter((f) => f.fee_month === ym);
      const salariesInMonth = store.teacher_salaries.filter((s) => s.salary_month === ym);
      const collected = feesInMonth.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
      const pending = feesInMonth.reduce((sum, f) => sum + Number(f.remaining_amount || 0), 0);
      const salaries = salariesInMonth.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
      return {
        month: ym,
        feeCollected: collected,
        pendingFees: pending,
        salaryExpense: salaries,
      };
    });

    // 3. Recent Activity Lists
    const recentStudents = [...store.students]
      .sort((a, b) => b.admission_date.localeCompare(a.admission_date))
      .slice(0, 5);

    const recentFeePayments = [...store.fee_payments]
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
      .slice(0, 5)
      .map((p) => {
        const stu = store.students.find((s) => s.id === p.student_id);
        const fee = store.student_fees.find((f) => f.id === p.fee_id);
        return {
          ...p,
          student_name: stu?.student_name || 'Unknown Student',
          class_name: stu?.class_name || fee?.class_name || '',
          fee_month: fee?.fee_month || '',
        };
      });

    const recentAttendance = [...store.student_attendance]
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || b.id - a.id)
      .slice(0, 6)
      .map((a) => {
        const stu = store.students.find((s) => s.id === a.student_id);
        return {
          ...a,
          student_name: stu?.student_name || 'Unknown Student',
          roll_number: stu?.roll_number || '',
        };
      });

    const upcomingFeeDeadlines = store.student_fees
      .filter((f) => f.status !== 'Paid' && f.remaining_amount > 0)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 5)
      .map((f) => {
        const stu = store.students.find((s) => s.id === f.student_id);
        return {
          ...f,
          student_name: stu?.student_name || 'Unknown Student',
          student_code: stu?.student_id || '',
          phone: stu?.phone || '',
        };
      });

    return res.json({
      success: true,
      kpis: {
        totalStudents: activeStudents.length,
        totalTeachers: activeTeachers.length,
        totalClasses: activeClasses.length,
        totalSubjects: activeSubjects.length,
        todayStudentAttendance: {
          present: stuPresent,
          absent: stuAbsent,
          late: stuLate,
          leave: stuLeave,
          total: stuAttTotal,
          percentage: todayStudentAttendancePct,
        },
        todayTeacherAttendance: {
          present: tchPresent,
          absent: tchAbsent,
          late: tchLate,
          leave: tchLeave,
          total: tchAttTotal,
          percentage: todayTeacherAttendancePct,
        },
        totalFeesCollected,
        pendingFees,
        totalSalaries,
        pendingSalaries,
      },
      charts: {
        monthlyAdmissions,
        studentsByClass,
        genderDistribution,
        attendanceBreakdown,
        monthlyFinance,
      },
      recentStudents,
      recentFeePayments,
      recentAttendance,
      upcomingFeeDeadlines,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load dashboard analytics.',
    });
  }
};

export const globalSearch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const rawQuery = String(req.query.q || '').trim().toLowerCase();
    const role = req.user?.role || 'Teacher';

    if (!rawQuery) {
      return res.json({
        success: true,
        results: {
          students: store.students.slice(0, 3),
          teachers: role === 'Accountant' ? [] : store.teachers.slice(0, 2),
          classes: store.classes.slice(0, 2),
          subjects: store.subjects.slice(0, 2),
          fees:
            role === 'Teacher'
              ? []
              : store.student_fees.slice(0, 2).map((f) => {
                  const s = store.students.find((stu) => stu.id === f.student_id);
                  return { ...f, student_name: s?.student_name || 'Unknown Student' };
                }),
          salaries:
            role === 'Teacher'
              ? []
              : store.teacher_salaries.slice(0, 2).map((sal) => {
                  const t = store.teachers.find((tch) => tch.id === sal.teacher_id);
                  return { ...sal, teacher_name: t?.teacher_name || 'Unknown Teacher' };
                }),
        },
      });
    }

    const students =
      role === 'Accountant'
        ? []
        : store.students
            .filter(
              (s) =>
                s.student_name.toLowerCase().includes(rawQuery) ||
                s.student_id.toLowerCase().includes(rawQuery) ||
                s.admission_number.toLowerCase().includes(rawQuery) ||
                s.roll_number.toLowerCase().includes(rawQuery) ||
                s.class_name.toLowerCase().includes(rawQuery) ||
                s.father_name.toLowerCase().includes(rawQuery) ||
                s.phone.toLowerCase().includes(rawQuery) ||
                s.email.toLowerCase().includes(rawQuery)
            )
            .slice(0, 5);

    const teachers =
      role !== 'Admin'
        ? []
        : store.teachers
            .filter(
              (t) =>
                t.teacher_name.toLowerCase().includes(rawQuery) ||
                t.employee_id.toLowerCase().includes(rawQuery) ||
                t.subject_specialization.toLowerCase().includes(rawQuery) ||
                t.qualification.toLowerCase().includes(rawQuery) ||
                t.email.toLowerCase().includes(rawQuery) ||
                t.phone.toLowerCase().includes(rawQuery)
            )
            .slice(0, 5);

    const classes =
      role === 'Accountant'
        ? []
        : store.classes
            .filter(
              (c) =>
                c.class_name.toLowerCase().includes(rawQuery) ||
                c.section.toLowerCase().includes(rawQuery) ||
                c.room_number.toLowerCase().includes(rawQuery)
            )
            .slice(0, 4);

    const subjects =
      role === 'Accountant'
        ? []
        : store.subjects
            .filter(
              (sub) =>
                sub.subject_name.toLowerCase().includes(rawQuery) ||
                sub.subject_code.toLowerCase().includes(rawQuery) ||
                sub.class_name.toLowerCase().includes(rawQuery)
            )
            .slice(0, 4);

    const fees =
      role === 'Teacher'
        ? []
        : store.student_fees
            .map((f) => {
              const s = store.students.find((stu) => stu.id === f.student_id);
              return {
                ...f,
                student_name: s?.student_name || 'Unknown Student',
                student_code: s?.student_id || '',
              };
            })
            .filter(
              (f) =>
                f.invoice_number.toLowerCase().includes(rawQuery) ||
                f.student_name.toLowerCase().includes(rawQuery) ||
                f.student_code.toLowerCase().includes(rawQuery) ||
                f.fee_month.toLowerCase().includes(rawQuery) ||
                f.status.toLowerCase().includes(rawQuery)
            )
            .slice(0, 5);

    const salaries =
      role === 'Teacher'
        ? []
        : store.teacher_salaries
            .map((sal) => {
              const t = store.teachers.find((tch) => tch.id === sal.teacher_id);
              return {
                ...sal,
                teacher_name: t?.teacher_name || 'Unknown Teacher',
              };
            })
            .filter(
              (sal) =>
                sal.slip_number.toLowerCase().includes(rawQuery) ||
                sal.teacher_name.toLowerCase().includes(rawQuery) ||
                sal.employee_id.toLowerCase().includes(rawQuery) ||
                sal.salary_month.toLowerCase().includes(rawQuery) ||
                sal.status.toLowerCase().includes(rawQuery)
            )
            .slice(0, 5);

    return res.json({
      success: true,
      results: {
        students,
        teachers,
        classes,
        subjects,
        fees,
        salaries,
      },
    });
  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to perform global search.',
    });
  }
};

