import { Response } from 'express';
import { db, ClassRow, SubjectRow } from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

// ============================================================================
// Classes Controller
// ============================================================================

export const getClasses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const { search = '', status = '' } = req.query as Record<string, string>;

    let classesWithMeta = store.classes.map((cls) => {
      const teacher = store.teachers.find((t) => t.id === cls.class_teacher_id);
      const studentsInClass = store.students.filter(
        (s) => s.class_name === cls.class_name && s.section === cls.section
      );
      return {
        ...cls,
        class_teacher_name: teacher?.teacher_name || 'Unassigned',
        student_count: studentsInClass.length,
        students: studentsInClass,
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      classesWithMeta = classesWithMeta.filter(
        (c) =>
          c.class_name.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q) ||
          c.room_number.toLowerCase().includes(q) ||
          c.class_teacher_name.toLowerCase().includes(q)
      );
    }

    if (status) {
      classesWithMeta = classesWithMeta.filter((c) => c.status === status);
    }

    return res.json({
      success: true,
      classes: classesWithMeta,
    });
  } catch (error) {
    console.error('Get classes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch classes.',
    });
  }
};

export const createClass = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const { class_name, section, class_teacher_id, room_number, capacity, status } = req.body;

    if (!class_name || !section || !room_number) {
      return res.status(400).json({
        success: false,
        message: 'Class Name, Section, and Room Number are required.',
      });
    }

    const exists = store.classes.some(
      (c) =>
        c.class_name.toLowerCase() === String(class_name).trim().toLowerCase() &&
        c.section.toLowerCase() === String(section).trim().toLowerCase()
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `${class_name} - Section ${section} already exists.`,
      });
    }

    const nowIso = new Date().toISOString();
    const newClass: ClassRow = {
      id: db.nextId('classes'),
      class_name: String(class_name).trim(),
      section: String(section).trim(),
      class_teacher_id: class_teacher_id ? Number(class_teacher_id) : null,
      room_number: String(room_number).trim(),
      capacity: Number(capacity) || 35,
      status: (status as any) || 'Active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.classes.push(newClass);
    await db.commit();

    return res.status(201).json({
      success: true,
      message: 'Class added successfully',
      classItem: newClass,
    });
  } catch (error) {
    console.error('Create class error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create class.',
    });
  }
};

export const updateClass = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const cls = store.classes.find((c) => c.id === id);
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Class not found.',
      });
    }

    const { class_name, section, class_teacher_id, room_number, capacity, status } = req.body;
    if (class_name !== undefined) cls.class_name = String(class_name).trim();
    if (section !== undefined) cls.section = String(section).trim();
    if (class_teacher_id !== undefined)
      cls.class_teacher_id = class_teacher_id ? Number(class_teacher_id) : null;
    if (room_number !== undefined) cls.room_number = String(room_number).trim();
    if (capacity !== undefined) cls.capacity = Number(capacity);
    if (status !== undefined) cls.status = status;
    cls.updated_at = new Date().toISOString();

    await db.commit();
    return res.json({
      success: true,
      message: 'Class updated successfully',
      classItem: cls,
    });
  } catch (error) {
    console.error('Update class error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update class.',
    });
  }
};

export const deleteClass = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const idx = store.classes.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: 'Class not found.',
      });
    }
    store.classes.splice(idx, 1);
    await db.commit();
    return res.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete class.',
    });
  }
};

// ============================================================================
// Subjects Controller
// ============================================================================

export const getSubjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const { search = '', class_name = '', status = '' } = req.query as Record<string, string>;

    let subjectsWithMeta = store.subjects.map((sub) => {
      const teacher = store.teachers.find((t) => t.id === sub.teacher_id);
      return {
        ...sub,
        teacher_name: teacher?.teacher_name || 'Unassigned',
        teacher_email: teacher?.email || '',
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      subjectsWithMeta = subjectsWithMeta.filter(
        (s) =>
          s.subject_name.toLowerCase().includes(q) ||
          s.subject_code.toLowerCase().includes(q) ||
          s.class_name.toLowerCase().includes(q) ||
          s.teacher_name.toLowerCase().includes(q)
      );
    }

    if (class_name) {
      subjectsWithMeta = subjectsWithMeta.filter((s) => s.class_name === class_name);
    }

    if (status) {
      subjectsWithMeta = subjectsWithMeta.filter((s) => s.status === status);
    }

    return res.json({
      success: true,
      subjects: subjectsWithMeta,
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch subjects.',
    });
  }
};

export const createSubject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const { subject_name, subject_code, class_name, teacher_id, description, status } = req.body;

    if (!subject_name || !subject_code || !class_name) {
      return res.status(400).json({
        success: false,
        message: 'Subject Name, Subject Code, and Class are required.',
      });
    }

    if (store.subjects.some((s) => s.subject_code.toLowerCase() === String(subject_code).trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Subject code "${subject_code}" already exists.`,
      });
    }

    const nowIso = new Date().toISOString();
    const newSubject: SubjectRow = {
      id: db.nextId('subjects'),
      subject_name: String(subject_name).trim(),
      subject_code: String(subject_code).trim().toUpperCase(),
      class_name: String(class_name).trim(),
      teacher_id: teacher_id ? Number(teacher_id) : null,
      description: description ? String(description).trim() : '',
      status: (status as any) || 'Active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.subjects.push(newSubject);
    await db.commit();

    return res.status(201).json({
      success: true,
      message: 'Subject added successfully',
      subject: newSubject,
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create subject.',
    });
  }
};

export const updateSubject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const sub = store.subjects.find((s) => s.id === id);
    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }

    const { subject_name, subject_code, class_name, teacher_id, description, status } = req.body;
    if (subject_name !== undefined) sub.subject_name = String(subject_name).trim();
    if (subject_code !== undefined) sub.subject_code = String(subject_code).trim().toUpperCase();
    if (class_name !== undefined) sub.class_name = String(class_name).trim();
    if (teacher_id !== undefined) sub.teacher_id = teacher_id ? Number(teacher_id) : null;
    if (description !== undefined) sub.description = String(description).trim();
    if (status !== undefined) sub.status = status;
    sub.updated_at = new Date().toISOString();

    await db.commit();
    return res.json({
      success: true,
      message: 'Subject updated successfully',
      subject: sub,
    });
  } catch (error) {
    console.error('Update subject error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update subject.',
    });
  }
};

export const deleteSubject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const store = db.getStore();
    const idx = store.subjects.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }
    store.subjects.splice(idx, 1);
    await db.commit();
    return res.json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete subject.',
    });
  }
};

