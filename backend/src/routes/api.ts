import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.ts';
import {
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/authController.ts';
import { getDashboardStats, globalSearch } from '../controllers/dashboardController.ts';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.ts';
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from '../controllers/teacherController.ts';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/academicController.ts';
import {
  getStudentAttendance,
  saveStudentAttendance,
  getTeacherAttendance,
  saveTeacherAttendance,
} from '../controllers/attendanceController.ts';
import {
  getStudentFees,
  createStudentFee,
  recordFeePayment,
  updateStudentFee,
  deleteStudentFee,
  getTeacherSalaries,
  createTeacherSalary,
  recordSalaryPayment,
  updateTeacherSalary,
  deleteTeacherSalary,
} from '../controllers/financeController.ts';
import { getReports } from '../controllers/reportController.ts';
import { askAI } from '../controllers/aiController.ts';

const router = Router();

// Public Auth Routes
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPassword);

// Protected Auth & Profile Routes
router.get('/auth/me', authenticateToken, getMe);
router.put('/auth/profile', authenticateToken, updateProfile);
router.put('/auth/change-password', authenticateToken, changePassword);

// Admin User Management Routes
router.get('/users', authenticateToken, authorizeRoles('Admin'), listUsers);
router.post('/users', authenticateToken, authorizeRoles('Admin'), createUser);
router.put('/users/:id', authenticateToken, authorizeRoles('Admin'), updateUser);
router.delete('/users/:id', authenticateToken, authorizeRoles('Admin'), deleteUser);

// Dashboard Analytics & Global Search
router.get('/dashboard', authenticateToken, getDashboardStats);
router.get('/search', authenticateToken, globalSearch);

// Students Module (Admin & Teacher can view; Admin can create/edit/delete)
router.get('/students', authenticateToken, getStudents);
router.get('/students/:id', authenticateToken, getStudentById);
router.post('/students', authenticateToken, authorizeRoles('Admin'), createStudent);
router.put('/students/:id', authenticateToken, authorizeRoles('Admin'), updateStudent);
router.delete('/students/:id', authenticateToken, authorizeRoles('Admin'), deleteStudent);

// Teachers Module
router.get('/teachers', authenticateToken, getTeachers);
router.get('/teachers/:id', authenticateToken, getTeacherById);
router.post('/teachers', authenticateToken, authorizeRoles('Admin'), createTeacher);
router.put('/teachers/:id', authenticateToken, authorizeRoles('Admin'), updateTeacher);
router.delete('/teachers/:id', authenticateToken, authorizeRoles('Admin'), deleteTeacher);

// Classes Module
router.get('/classes', authenticateToken, getClasses);
router.post('/classes', authenticateToken, authorizeRoles('Admin'), createClass);
router.put('/classes/:id', authenticateToken, authorizeRoles('Admin'), updateClass);
router.delete('/classes/:id', authenticateToken, authorizeRoles('Admin'), deleteClass);

// Subjects Module
router.get('/subjects', authenticateToken, getSubjects);
router.post('/subjects', authenticateToken, authorizeRoles('Admin'), createSubject);
router.put('/subjects/:id', authenticateToken, authorizeRoles('Admin'), updateSubject);
router.delete('/subjects/:id', authenticateToken, authorizeRoles('Admin'), deleteSubject);

// Student Attendance Module (Admin & Teacher)
router.get('/student-attendance', authenticateToken, getStudentAttendance);
router.post(
  '/student-attendance',
  authenticateToken,
  authorizeRoles('Admin', 'Teacher'),
  saveStudentAttendance
);

// Teacher Attendance Module (Admin can mark; Teacher can view own/all)
router.get('/teacher-attendance', authenticateToken, getTeacherAttendance);
router.post(
  '/teacher-attendance',
  authenticateToken,
  authorizeRoles('Admin'),
  saveTeacherAttendance
);

// Student Fees Module (Admin & Accountant)
router.get('/student-fees', authenticateToken, getStudentFees);
router.post(
  '/student-fees',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  createStudentFee
);
router.post(
  '/student-fees/:id/pay',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  recordFeePayment
);
router.put(
  '/student-fees/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  updateStudentFee
);
router.delete(
  '/student-fees/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  deleteStudentFee
);

// Teacher Salaries Module (Admin & Accountant)
router.get('/teacher-salaries', authenticateToken, getTeacherSalaries);
router.post(
  '/teacher-salaries',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  createTeacherSalary
);
router.post(
  '/teacher-salaries/:id/pay',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  recordSalaryPayment
);
router.put(
  '/teacher-salaries/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Accountant'),
  updateTeacherSalary
);
router.delete(
  '/teacher-salaries/:id',
  authenticateToken,
  authorizeRoles('Admin'),
  deleteTeacherSalary
);

// Reports Module
router.get('/reports', authenticateToken, getReports);

// AI Assistant
router.post('/ai/ask', authenticateToken, askAI);

export default router;
