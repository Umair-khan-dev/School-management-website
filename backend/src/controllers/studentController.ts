import { Response } from 'express';
import { db, StudentRow } from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const getStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      search = '',
      class_name = '',
      section = '',
      status = '',
      gender = '',
      sortBy = 'student_name',
      sortOrder = 'asc',
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    let filtered = [...store.students];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          s.student_id.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q) ||
          s.father_name.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.roll_number.toLowerCase().includes(q)
      );
    }

    if (class_name) {
      filtered = filtered.filter((s) => s.class_name === class_name);
    }
    if (section) {
      filtered = filtered.filter((s) => s.section === section);
    }
    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }
    if (gender) {
      filtered = filtered.filter((s) => s.gender === gender);
    }

    filtered.sort((a, b) => {
      const valA = String((a as any)[sortBy] ?? '').toLowerCase();
      const valB = String((b as any)[sortBy] ?? '').toLowerCase();
      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      success: true,
      students: paginated,
      allFilteredCount: total,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch student records.',
    });
  }
};

export const getStudentById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const student = store.students.find((s) => s.id === id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.',
      });
    }

    // Include Attendance Summary, Fee History, and Payment History for Student Details Page
    const attendanceRecords = store.student_attendance
      .filter((a) => a.student_id === id)
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

    const presentCount = attendanceRecords.filter((a) => a.status === 'Present').length;
    const absentCount = attendanceRecords.filter((a) => a.status === 'Absent').length;
    const lateCount = attendanceRecords.filter((a) => a.status === 'Late').length;
    const leaveCount = attendanceRecords.filter((a) => a.status === 'Leave').length;
    const totalWorkingDays = attendanceRecords.length;
    const attendancePercentage =
      totalWorkingDays > 0 ? Math.round(((presentCount + lateCount) / totalWorkingDays) * 100) : 100;

    const feeHistory = store.student_fees
      .filter((f) => f.student_id === id)
      .sort((a, b) => b.fee_month.localeCompare(a.fee_month));

    const paymentHistory = store.fee_payments
      .filter((p) => p.student_id === id)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date));

    return res.json({
      success: true,
      student,
      attendanceSummary: {
        totalWorkingDays,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        attendancePercentage,
        records: attendanceRecords,
      },
      feeHistory,
      paymentHistory,
    });
  } catch (error) {
    console.error('Get student details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load student profile details.',
    });
  }
};

export const createStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const {
      student_id,
      admission_number,
      student_name,
      father_name,
      mother_name,
      gender,
      date_of_birth,
      class_name,
      section,
      roll_number,
      phone,
      email,
      address,
      city,
      previous_school,
      admission_date,
      profile_image,
      status,
    } = req.body;

    if (!student_name || !father_name || !class_name || !section || !roll_number || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required student fields (Name, Father Name, Class, Section, Roll Number, Phone).',
      });
    }

    const nextNumericId = db.nextId('students');
    const finalStudentId =
      student_id && String(student_id).trim()
        ? String(student_id).trim()
        : `STU-2026-${String(nextNumericId).padStart(3, '0')}`;
    const finalAdmissionNo =
      admission_number && String(admission_number).trim()
        ? String(admission_number).trim()
        : `ADM-2026-${String(100 + nextNumericId)}`;

    if (store.students.some((s) => s.student_id.toLowerCase() === finalStudentId.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Student ID "${finalStudentId}" is already assigned to another student.`,
      });
    }

    if (store.students.some((s) => s.admission_number.toLowerCase() === finalAdmissionNo.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Admission Number "${finalAdmissionNo}" already exists.`,
      });
    }

    const nowIso = new Date().toISOString();
    const newStudent: StudentRow = {
      id: nextNumericId,
      student_id: finalStudentId,
      admission_number: finalAdmissionNo,
      student_name: String(student_name).trim(),
      father_name: String(father_name).trim(),
      mother_name: mother_name ? String(mother_name).trim() : '',
      gender: (gender as any) || 'Female',
      date_of_birth: date_of_birth || '2011-01-01',
      class_name: String(class_name).trim(),
      section: String(section).trim(),
      roll_number: String(roll_number).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : `${finalStudentId.toLowerCase()}@student.pinkedu.edu`,
      address: address ? String(address).trim() : '',
      city: city ? String(city).trim() : 'Boston',
      previous_school: previous_school ? String(previous_school).trim() : '',
      admission_date: admission_date || nowIso.slice(0, 10),
      profile_image:
        profile_image && String(profile_image).trim()
          ? String(profile_image).trim()
          : '/src/assets/images/avatar_student_scholar_1790499608419.jpg',
      status: (status as any) || 'Active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.students.push(newStudent);
    await db.commit();

    return res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: newStudent,
    });
  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save student',
    });
  }
};

export const updateStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const student = store.students.find((s) => s.id === id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const fields: Array<keyof StudentRow> = [
      'student_id',
      'admission_number',
      'student_name',
      'father_name',
      'mother_name',
      'gender',
      'date_of_birth',
      'class_name',
      'section',
      'roll_number',
      'phone',
      'email',
      'address',
      'city',
      'previous_school',
      'admission_date',
      'profile_image',
      'status',
    ];

    for (const key of fields) {
      if (req.body[key] !== undefined) {
        (student as any)[key] = req.body[key];
      }
    }
    student.updated_at = new Date().toISOString();
    await db.commit();

    return res.json({
      success: true,
      message: 'Student updated successfully',
      student,
    });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update student record.',
    });
  }
};

export const deleteStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const idx = store.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    await db.transaction((s) => {
      s.students.splice(idx, 1);
      // Cascade delete attendance & fees
      s.student_attendance = s.student_attendance.filter((a) => a.student_id !== id);
      s.student_fees = s.student_fees.filter((f) => f.student_id !== id);
      s.fee_payments = s.fee_payments.filter((p) => p.student_id !== id);
    });

    return res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete student.',
    });
  }
};

