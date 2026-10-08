import { Response } from 'express';
import {
  db,
  getTodayDateString,
  AttendanceStatus,
  StudentAttendanceRow,
  TeacherAttendanceRow,
} from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

// ============================================================================
// Student Attendance
// ============================================================================

export const getStudentAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      date = getTodayDateString(),
      class_name = '',
      section = '',
      month = '',
      student_id = '',
    } = req.query as Record<string, string>;

    // Filter students for roster
    let rosterStudents = store.students.filter((s) => s.status === 'Active');
    if (class_name) {
      rosterStudents = rosterStudents.filter((s) => s.class_name === class_name);
    }
    if (section) {
      rosterStudents = rosterStudents.filter((s) => s.section === section);
    }

    // Build daily roster with attendance status for `date` and overall percentage
    const dailyRoster = rosterStudents.map((stu) => {
      const existing = store.student_attendance.find(
        (a) => a.student_id === stu.id && a.attendance_date === date
      );
      const stuAllRecords = store.student_attendance.filter((a) => a.student_id === stu.id);
      const stuPresent = stuAllRecords.filter(
        (a) => a.status === 'Present' || a.status === 'Late'
      ).length;
      const attendancePercentage =
        stuAllRecords.length > 0 ? Math.round((stuPresent / stuAllRecords.length) * 100) : 100;

      return {
        student_id: stu.id,
        student_code: stu.student_id,
        student_name: stu.student_name,
        roll_number: stu.roll_number,
        class_name: stu.class_name,
        section: stu.section,
        profile_image: stu.profile_image,
        attendance_id: existing?.id || null,
        attendance_date: date,
        status: existing?.status || ('Present' as AttendanceStatus),
        remarks: existing?.remarks || '',
        is_marked: Boolean(existing),
        attendancePercentage,
        totalMarkedDays: stuAllRecords.length,
      };
    });

    // Historical records filtered by optional month, class_name, section, student_id
    let history = store.student_attendance.map((rec) => {
      const stu = store.students.find((s) => s.id === rec.student_id);
      return {
        ...rec,
        student_name: stu?.student_name || 'Unknown Student',
        student_code: stu?.student_id || '',
        roll_number: stu?.roll_number || '',
      };
    });

    if (class_name) {
      history = history.filter((h) => h.class_name === class_name);
    }
    if (section) {
      history = history.filter((h) => h.section === section);
    }
    if (month) {
      history = history.filter((h) => h.attendance_date.startsWith(month));
    }
    if (student_id) {
      history = history.filter((h) => h.student_id === Number(student_id));
    }

    history.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

    const summary = {
      present: dailyRoster.filter((r) => r.status === 'Present').length,
      absent: dailyRoster.filter((r) => r.status === 'Absent').length,
      late: dailyRoster.filter((r) => r.status === 'Late').length,
      leave: dailyRoster.filter((r) => r.status === 'Leave').length,
      total: dailyRoster.length,
    };

    return res.json({
      success: true,
      date,
      roster: dailyRoster,
      summary,
      history,
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch student attendance.',
    });
  }
};

export const saveStudentAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, records } = req.body as {
      date: string;
      records: Array<{
        student_id: number;
        class_name?: string;
        section?: string;
        status: AttendanceStatus;
        remarks?: string;
      }>;
    };

    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance date and student attendance records are required.',
      });
    }

    const nowIso = new Date().toISOString();
    let insertedCount = 0;
    let updatedCount = 0;

    await db.transaction((store) => {
      for (const item of records) {
        const stu = store.students.find((s) => s.id === Number(item.student_id));
        if (!stu) continue;

        // Unique constraint enforcement: (student_id, attendance_date)
        const existing = store.student_attendance.find(
          (a) => a.student_id === stu.id && a.attendance_date === date
        );

        if (existing) {
          existing.status = item.status;
          existing.remarks = item.remarks !== undefined ? String(item.remarks).trim() : existing.remarks;
          existing.marked_by = req.user?.id || 1;
          existing.updated_at = nowIso;
          updatedCount++;
        } else {
          const newRow: StudentAttendanceRow = {
            id: db.nextId('student_attendance'),
            student_id: stu.id,
            attendance_date: date,
            class_name: item.class_name || stu.class_name,
            section: item.section || stu.section,
            status: item.status,
            remarks: item.remarks ? String(item.remarks).trim() : '',
            marked_by: req.user?.id || 1,
            created_at: nowIso,
            updated_at: nowIso,
          };
          store.student_attendance.push(newRow);
          insertedCount++;
        }
      }
    });

    return res.json({
      success: true,
      message: 'Attendance saved successfully',
      stats: { insertedCount, updatedCount },
    });
  } catch (error) {
    console.error('Save student attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save student attendance.',
    });
  }
};

// ============================================================================
// Teacher Attendance
// ============================================================================

export const getTeacherAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const { date = getTodayDateString(), month = '', teacher_id = '' } = req.query as Record<
      string,
      string
    >;

    const roster = store.teachers.map((t) => {
      const existing = store.teacher_attendance.find(
        (a) => a.teacher_id === t.id && a.attendance_date === date
      );
      const tAll = store.teacher_attendance.filter((a) => a.teacher_id === t.id);
      const tPresent = tAll.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const attendancePercentage =
        tAll.length > 0 ? Math.round((tPresent / tAll.length) * 100) : 100;

      return {
        teacher_id: t.id,
        employee_id: t.employee_id,
        teacher_name: t.teacher_name,
        subject_specialization: t.subject_specialization,
        assigned_class: t.assigned_class,
        profile_image: t.profile_image,
        attendance_id: existing?.id || null,
        attendance_date: date,
        status: existing?.status || ('Present' as AttendanceStatus),
        check_in_time: existing?.check_in_time || '07:55 AM',
        remarks: existing?.remarks || '',
        is_marked: Boolean(existing),
        attendancePercentage,
        totalMarkedDays: tAll.length,
      };
    });

    let history = store.teacher_attendance.map((rec) => {
      const t = store.teachers.find((tch) => tch.id === rec.teacher_id);
      return {
        ...rec,
        teacher_name: t?.teacher_name || 'Unknown Teacher',
        employee_id: t?.employee_id || '',
        subject_specialization: t?.subject_specialization || '',
      };
    });

    if (month) {
      history = history.filter((h) => h.attendance_date.startsWith(month));
    }
    if (teacher_id) {
      history = history.filter((h) => h.teacher_id === Number(teacher_id));
    }

    history.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

    const summary = {
      present: roster.filter((r) => r.status === 'Present').length,
      absent: roster.filter((r) => r.status === 'Absent').length,
      late: roster.filter((r) => r.status === 'Late').length,
      leave: roster.filter((r) => r.status === 'Leave').length,
      total: roster.length,
    };

    return res.json({
      success: true,
      date,
      roster,
      summary,
      history,
    });
  } catch (error) {
    console.error('Get teacher attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch teacher attendance.',
    });
  }
};

export const saveTeacherAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, records } = req.body as {
      date: string;
      records: Array<{
        teacher_id: number;
        status: AttendanceStatus;
        check_in_time?: string;
        remarks?: string;
      }>;
    };

    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance date and teacher records are required.',
      });
    }

    const nowIso = new Date().toISOString();

    await db.transaction((store) => {
      for (const item of records) {
        const teacher = store.teachers.find((t) => t.id === Number(item.teacher_id));
        if (!teacher) continue;

        const existing = store.teacher_attendance.find(
          (a) => a.teacher_id === teacher.id && a.attendance_date === date
        );

        if (existing) {
          existing.status = item.status;
          if (item.check_in_time !== undefined) existing.check_in_time = item.check_in_time;
          if (item.remarks !== undefined) existing.remarks = String(item.remarks).trim();
          existing.marked_by = req.user?.id || 1;
          existing.updated_at = nowIso;
        } else {
          const newRow: TeacherAttendanceRow = {
            id: db.nextId('teacher_attendance'),
            teacher_id: teacher.id,
            attendance_date: date,
            status: item.status,
            check_in_time: item.check_in_time || (item.status === 'Present' ? '07:55 AM' : '--:--'),
            remarks: item.remarks ? String(item.remarks).trim() : '',
            marked_by: req.user?.id || 1,
            created_at: nowIso,
            updated_at: nowIso,
          };
          store.teacher_attendance.push(newRow);
        }
      }
    });

    return res.json({
      success: true,
      message: 'Attendance saved successfully',
    });
  } catch (error) {
    console.error('Save teacher attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save teacher attendance.',
    });
  }
};

