import { Response } from 'express';
import { db, TeacherRow } from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const getTeachers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      search = '',
      subject = '',
      assigned_class = '',
      status = '',
      sortBy = 'teacher_name',
      sortOrder = 'asc',
    } = req.query as Record<string, string>;

    let filtered = [...store.teachers];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.teacher_name.toLowerCase().includes(q) ||
          t.employee_id.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q) ||
          t.subject_specialization.toLowerCase().includes(q) ||
          t.qualification.toLowerCase().includes(q)
      );
    }

    if (subject) {
      filtered = filtered.filter((t) =>
        t.subject_specialization.toLowerCase().includes(subject.toLowerCase())
      );
    }
    if (assigned_class) {
      filtered = filtered.filter((t) => t.assigned_class === assigned_class);
    }
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }

    filtered.sort((a, b) => {
      const valA = String((a as any)[sortBy] ?? '').toLowerCase();
      const valB = String((b as any)[sortBy] ?? '').toLowerCase();
      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return res.json({
      success: true,
      teachers: filtered,
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch teacher directory.',
    });
  }
};

export const getTeacherById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const teacher = store.teachers.find((t) => t.id === id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.',
      });
    }

    const attendanceHistory = store.teacher_attendance
      .filter((a) => a.teacher_id === id)
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

    const presentCount = attendanceHistory.filter((a) => a.status === 'Present').length;
    const absentCount = attendanceHistory.filter((a) => a.status === 'Absent').length;
    const lateCount = attendanceHistory.filter((a) => a.status === 'Late').length;
    const leaveCount = attendanceHistory.filter((a) => a.status === 'Leave').length;
    const totalDays = attendanceHistory.length;
    const attendancePercentage =
      totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

    const salaryHistory = store.teacher_salaries
      .filter((s) => s.teacher_id === id)
      .sort((a, b) => b.salary_month.localeCompare(a.salary_month));

    const assignedClasses = store.classes.filter((c) => c.class_teacher_id === id);
    const assignedSubjects = store.subjects.filter((s) => s.teacher_id === id);

    return res.json({
      success: true,
      teacher,
      attendanceSummary: {
        totalDays,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        attendancePercentage,
        records: attendanceHistory,
      },
      salaryHistory,
      assignedClasses,
      assignedSubjects,
    });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load teacher profile.',
    });
  }
};

export const createTeacher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      employee_id,
      teacher_name,
      father_name,
      gender,
      date_of_birth,
      phone,
      email,
      address,
      qualification,
      subject_specialization,
      assigned_class,
      joining_date,
      basic_salary,
      profile_image,
      status,
    } = req.body;

    if (!teacher_name || !phone || !email || !subject_specialization) {
      return res.status(400).json({
        success: false,
        message: 'Teacher Name, Phone, Email, and Subject Specialization are required.',
      });
    }

    const nextId = db.nextId('teachers');
    const finalEmpId =
      employee_id && String(employee_id).trim()
        ? String(employee_id).trim()
        : `EMP-2026-${String(nextId).padStart(3, '0')}`;

    if (store.teachers.some((t) => t.employee_id.toLowerCase() === finalEmpId.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Employee ID "${finalEmpId}" already exists.`,
      });
    }

    const nowIso = new Date().toISOString();
    const newTeacher: TeacherRow = {
      id: nextId,
      employee_id: finalEmpId,
      teacher_name: String(teacher_name).trim(),
      father_name: father_name ? String(father_name).trim() : '',
      gender: (gender as any) || 'Female',
      date_of_birth: date_of_birth || '1989-01-01',
      phone: String(phone).trim(),
      email: String(email).trim(),
      address: address ? String(address).trim() : '',
      qualification: qualification ? String(qualification).trim() : 'M.Ed.',
      subject_specialization: String(subject_specialization).trim(),
      assigned_class: assigned_class ? String(assigned_class).trim() : 'Grade 10',
      joining_date: joining_date || nowIso.slice(0, 10),
      basic_salary: Number(basic_salary) || 4200,
      profile_image:
        profile_image && String(profile_image).trim()
          ? String(profile_image).trim()
          : '/src/assets/images/avatar_teacher_science_1790499596793.jpg',
      status: (status as any) || 'Active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.teachers.push(newTeacher);
    await db.commit();

    return res.status(201).json({
      success: true,
      message: 'Teacher added successfully',
      teacher: newTeacher,
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save teacher.',
    });
  }
};

export const updateTeacher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const teacher = store.teachers.find((t) => t.id === id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.',
      });
    }

    const fields: Array<keyof TeacherRow> = [
      'employee_id',
      'teacher_name',
      'father_name',
      'gender',
      'date_of_birth',
      'phone',
      'email',
      'address',
      'qualification',
      'subject_specialization',
      'assigned_class',
      'joining_date',
      'basic_salary',
      'profile_image',
      'status',
    ];

    for (const key of fields) {
      if (req.body[key] !== undefined) {
        (teacher as any)[key] = key === 'basic_salary' ? Number(req.body[key]) : req.body[key];
      }
    }
    teacher.updated_at = new Date().toISOString();
    await db.commit();

    return res.json({
      success: true,
      message: 'Teacher updated successfully',
      teacher,
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update teacher.',
    });
  }
};

export const deleteTeacher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const idx = store.teachers.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.',
      });
    }

    await db.transaction((s) => {
      s.teachers.splice(idx, 1);
      // Set null on foreign keys in classes & subjects
      s.classes.forEach((c) => {
        if (c.class_teacher_id === id) c.class_teacher_id = null;
      });
      s.subjects.forEach((sub) => {
        if (sub.teacher_id === id) sub.teacher_id = null;
      });
      s.teacher_attendance = s.teacher_attendance.filter((a) => a.teacher_id !== id);
      s.teacher_salaries = s.teacher_salaries.filter((sal) => sal.teacher_id !== id);
      s.salary_payments = s.salary_payments.filter((p) => p.teacher_id !== id);
    });

    return res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete teacher.',
    });
  }
};

