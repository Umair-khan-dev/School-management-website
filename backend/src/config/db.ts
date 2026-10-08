import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mysql, { Pool, RowDataPacket } from 'mysql2/promise';

// ============================================================================
// Cryptographic Utilities (Salted Password Hashing & JWT HS256 Implementation)
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'pinkedu-enterprise-jwt-secret-key-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, salt, keyHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(keyHex, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role: 'Admin' | 'Accountant' | 'Teacher';
  linkedTeacherId?: number | null;
  exp: number;
}

export function signJwt(payload: Omit<JwtPayload, 'exp'>, expiresInSeconds = 86400 * 7): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const fullPayload: JwtPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// Relational Database Types (Matching MySQL 8.0 Schema)
// ============================================================================

export type UserRole = 'Admin' | 'Accountant' | 'Teacher';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';
export type PaymentMethod = 'Cash' | 'Bank' | 'Online';
export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string;
  avatar_url: string;
  linked_teacher_id: number | null;
  status: 'Active' | 'Inactive';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherRow {
  id: number;
  employee_id: string;
  teacher_name: string;
  father_name: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  qualification: string;
  subject_specialization: string;
  assigned_class: string;
  joining_date: string;
  basic_salary: number;
  profile_image: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: number;
  class_name: string;
  section: string;
  class_teacher_id: number | null;
  room_number: string;
  capacity: number;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface SubjectRow {
  id: number;
  subject_name: string;
  subject_code: string;
  class_name: string;
  teacher_id: number | null;
  description: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: number;
  student_id: string;
  admission_number: string;
  student_name: string;
  father_name: string;
  mother_name: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: string;
  class_name: string;
  section: string;
  roll_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  previous_school: string;
  admission_date: string;
  profile_image: string;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
  created_at: string;
  updated_at: string;
}

export interface StudentAttendanceRow {
  id: number;
  student_id: number;
  attendance_date: string;
  class_name: string;
  section: string;
  status: AttendanceStatus;
  remarks: string;
  marked_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAttendanceRow {
  id: number;
  teacher_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time: string;
  remarks: string;
  marked_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentFeeRow {
  id: number;
  invoice_number: string;
  student_id: number;
  class_name: string;
  fee_month: string;
  tuition_fee: number;
  admission_fee: number;
  transport_fee: number;
  exam_fee: number;
  other_fee: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  payment_date: string | null;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FeePaymentRow {
  id: number;
  receipt_number: string;
  fee_id: number;
  student_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_no: string;
  notes: string;
  received_by: number | null;
  created_at: string;
}

export interface TeacherSalaryRow {
  id: number;
  slip_number: string;
  teacher_id: number;
  employee_id: string;
  salary_month: string;
  basic_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  paid_amount: number;
  remaining_salary: number;
  payment_date: string | null;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryPaymentRow {
  id: number;
  voucher_number: string;
  salary_id: number;
  teacher_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes: string;
  processed_by: number | null;
  created_at: string;
}

export interface DatabaseStore {
  users: UserRow[];
  teachers: TeacherRow[];
  classes: ClassRow[];
  subjects: SubjectRow[];
  students: StudentRow[];
  student_attendance: StudentAttendanceRow[];
  teacher_attendance: TeacherAttendanceRow[];
  student_fees: StudentFeeRow[];
  fee_payments: FeePaymentRow[];
  teacher_salaries: TeacherSalaryRow[];
  salary_payments: SalaryPaymentRow[];
}

const DB_FILE_PATH = path.resolve(process.cwd(), 'backend/database/pinkedu_store.json');

const AVATAR_PRINCIPAL = '/src/assets/images/avatar_admin_principal_1790499584190.jpg';
const AVATAR_TEACHER = '/src/assets/images/avatar_teacher_science_1790499596793.jpg';
const AVATAR_STUDENT = '/src/assets/images/avatar_student_scholar_1790499608419.jpg';

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

function buildInitialSeedData(): DatabaseStore {
  const nowIso = new Date().toISOString();
  const today = getTodayDateString();
  const currentMonth = getCurrentMonthString(); // e.g. 2026-09
  const prevMonth = '2026-08';
  const twoMonthsAgo = '2026-07';

  const users: UserRow[] = [
    {
      id: 1,
      name: 'Dr. Eleanor Vance',
      email: 'admin@pinkedu.edu',
      password_hash: hashPassword('Admin@123'),
      role: 'Admin',
      phone: '+1 (555) 234-8900',
      avatar_url: AVATAR_PRINCIPAL,
      linked_teacher_id: null,
      status: 'Active',
      last_login_at: nowIso,
      created_at: '2025-01-10T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 2,
      name: 'Marcus Sterling',
      email: 'accountant@pinkedu.edu',
      password_hash: hashPassword('Finance@123'),
      role: 'Accountant',
      phone: '+1 (555) 234-8912',
      avatar_url: AVATAR_TEACHER,
      linked_teacher_id: null,
      status: 'Active',
      last_login_at: nowIso,
      created_at: '2025-01-12T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 3,
      name: 'Prof. Arthur Pendelton',
      email: 'teacher@pinkedu.edu',
      password_hash: hashPassword('Teacher@123'),
      role: 'Teacher',
      phone: '+1 (555) 390-1122',
      avatar_url: AVATAR_TEACHER,
      linked_teacher_id: 1,
      status: 'Active',
      last_login_at: nowIso,
      created_at: '2025-01-15T09:00:00.000Z',
      updated_at: nowIso,
    },
  ];

  const teachers: TeacherRow[] = [
    {
      id: 1,
      employee_id: 'EMP-2026-001',
      teacher_name: 'Prof. Arthur Pendelton',
      father_name: 'Richard Pendelton',
      gender: 'Male',
      date_of_birth: '1985-04-14',
      phone: '+1 (555) 390-1122',
      email: 'teacher@pinkedu.edu',
      address: '412 Rosewood Avenue, Suite 4B, Boston',
      qualification: 'M.Sc. Physics, B.Ed.',
      subject_specialization: 'Physics & Calculus',
      assigned_class: 'Grade 10',
      joining_date: '2022-08-15',
      basic_salary: 4800,
      profile_image: AVATAR_TEACHER,
      status: 'Active',
      created_at: '2022-08-15T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 2,
      employee_id: 'EMP-2026-002',
      teacher_name: 'Clara Rosalind Lin',
      father_name: 'David Lin',
      gender: 'Female',
      date_of_birth: '1990-09-22',
      phone: '+1 (555) 418-2209',
      email: 'clara.lin@pinkedu.edu',
      address: '88 Magnolia Terrace, Cambridge',
      qualification: 'M.A. English Literature',
      subject_specialization: 'English Literature',
      assigned_class: 'Grade 9',
      joining_date: '2023-01-10',
      basic_salary: 4400,
      profile_image: AVATAR_PRINCIPAL,
      status: 'Active',
      created_at: '2023-01-10T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 3,
      employee_id: 'EMP-2026-003',
      teacher_name: 'Dr. Nadia Al-Mansoor',
      father_name: 'Karim Al-Mansoor',
      gender: 'Female',
      date_of_birth: '1988-11-03',
      phone: '+1 (555) 509-7741',
      email: 'nadia.mansoor@pinkedu.edu',
      address: '19 Beacon Hill Rd, Boston',
      qualification: 'Ph.D. Organic Chemistry',
      subject_specialization: 'Chemistry & Biology',
      assigned_class: 'Grade 10',
      joining_date: '2021-09-01',
      basic_salary: 5200,
      profile_image: AVATAR_PRINCIPAL,
      status: 'Active',
      created_at: '2021-09-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 4,
      employee_id: 'EMP-2026-004',
      teacher_name: 'Julian Thorne',
      father_name: 'Edward Thorne',
      gender: 'Male',
      date_of_birth: '1992-02-18',
      phone: '+1 (555) 612-9984',
      email: 'julian.thorne@pinkedu.edu',
      address: '740 Commonwealth Ave, Brookline',
      qualification: 'M.S. Computer Science',
      subject_specialization: 'Computer Science',
      assigned_class: 'Grade 8',
      joining_date: '2024-02-01',
      basic_salary: 4600,
      profile_image: AVATAR_TEACHER,
      status: 'Active',
      created_at: '2024-02-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 5,
      employee_id: 'EMP-2026-005',
      teacher_name: 'Hannah Montclair',
      father_name: 'Thomas Montclair',
      gender: 'Female',
      date_of_birth: '1991-06-30',
      phone: '+1 (555) 781-3340',
      email: 'hannah.montclair@pinkedu.edu',
      address: '215 Newbury St, Boston',
      qualification: 'M.Ed. Mathematics',
      subject_specialization: 'Mathematics',
      assigned_class: 'Grade 7',
      joining_date: '2023-08-20',
      basic_salary: 4300,
      profile_image: AVATAR_PRINCIPAL,
      status: 'Active',
      created_at: '2023-08-20T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 6,
      employee_id: 'EMP-2026-006',
      teacher_name: 'Mateo Rivera',
      father_name: 'Carlos Rivera',
      gender: 'Male',
      date_of_birth: '1987-12-11',
      phone: '+1 (555) 894-5120',
      email: 'mateo.rivera@pinkedu.edu',
      address: '62 Harvard St, Somerville',
      qualification: 'M.A. World History',
      subject_specialization: 'History & Civics',
      assigned_class: 'Grade 9',
      joining_date: '2022-03-14',
      basic_salary: 4250,
      profile_image: AVATAR_TEACHER,
      status: 'On Leave',
      created_at: '2022-03-14T08:00:00.000Z',
      updated_at: nowIso,
    },
  ];

  const classes: ClassRow[] = [
    {
      id: 1,
      class_name: 'Grade 10',
      section: 'A',
      class_teacher_id: 1,
      room_number: 'RM-301',
      capacity: 32,
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 2,
      class_name: 'Grade 10',
      section: 'B',
      class_teacher_id: 3,
      room_number: 'RM-302',
      capacity: 32,
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 3,
      class_name: 'Grade 9',
      section: 'A',
      class_teacher_id: 2,
      room_number: 'RM-204',
      capacity: 35,
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 4,
      class_name: 'Grade 9',
      section: 'B',
      class_teacher_id: 6,
      room_number: 'RM-205',
      capacity: 35,
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 5,
      class_name: 'Grade 8',
      section: 'A',
      class_teacher_id: 4,
      room_number: 'RM-108',
      capacity: 30,
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 6,
      class_name: 'Grade 7',
      section: 'A',
      class_teacher_id: 5,
      room_number: 'RM-102',
      capacity: 30,
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
  ];

  const subjects: SubjectRow[] = [
    {
      id: 1,
      subject_name: 'Advanced Physics',
      subject_code: 'PHY-101',
      class_name: 'Grade 10',
      teacher_id: 1,
      description: 'Classical mechanics, electromagnetism, optics, and modern wave phenomena with lab practicum.',
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 2,
      subject_name: 'Organic & Analytical Chemistry',
      subject_code: 'CHM-102',
      class_name: 'Grade 10',
      teacher_id: 3,
      description: 'Stoichiometry, chemical thermodynamics, molecular bonding, and organic synthesis foundations.',
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 3,
      subject_name: 'World Literature & Rhetoric',
      subject_code: 'ENG-201',
      class_name: 'Grade 9',
      teacher_id: 2,
      description: 'Critical literary analysis, persuasive composition, classical drama, and contemporary prose.',
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 4,
      subject_name: 'Algorithms & Computer Science',
      subject_code: 'CSC-301',
      class_name: 'Grade 8',
      teacher_id: 4,
      description: 'Computational thinking, Python programming, data structures, and web systems architecture.',
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 5,
      subject_name: 'Honors Algebra & Geometry',
      subject_code: 'MAT-105',
      class_name: 'Grade 7',
      teacher_id: 5,
      description: 'Linear systems, quadratic functions, Euclidean proofs, and spatial coordinate geometry.',
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 6,
      subject_name: 'Modern World History & Civics',
      subject_code: 'HIS-204',
      class_name: 'Grade 9',
      teacher_id: 6,
      description: 'Global geopolitical transformations, constitutional institutions, and economic history.',
      status: 'Active',
      created_at: '2025-01-01T08:00:00.000Z',
      updated_at: nowIso,
    },
  ];

  const students: StudentRow[] = [
    {
      id: 1,
      student_id: 'STU-2026-001',
      admission_number: 'ADM-2026-101',
      student_name: 'Sophia Kensington',
      father_name: 'William Kensington',
      mother_name: 'Victoria Kensington',
      gender: 'Female',
      date_of_birth: '2010-05-14',
      class_name: 'Grade 10',
      section: 'A',
      roll_number: '10A-01',
      phone: '+1 (555) 801-1101',
      email: 'sophia.kensington@student.pinkedu.edu',
      address: '142 Newbury Street, Apt 3A',
      city: 'Boston',
      previous_school: 'St. Jude Preparatory Academy',
      admission_date: '2026-01-15',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-01-15T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 2,
      student_id: 'STU-2026-002',
      admission_number: 'ADM-2026-102',
      student_name: 'Liam Hawthorne',
      father_name: 'Gregory Hawthorne',
      mother_name: 'Claire Hawthorne',
      gender: 'Male',
      date_of_birth: '2010-08-22',
      class_name: 'Grade 10',
      section: 'A',
      roll_number: '10A-02',
      phone: '+1 (555) 801-1102',
      email: 'liam.hawthorne@student.pinkedu.edu',
      address: '78 Beacon Street',
      city: 'Boston',
      previous_school: 'Cambridge Latin School',
      admission_date: '2026-02-10',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-02-10T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 3,
      student_id: 'STU-2026-003',
      admission_number: 'ADM-2026-103',
      student_name: 'Aria Chen',
      father_name: 'Raymond Chen',
      mother_name: 'Mei-Ling Chen',
      gender: 'Female',
      date_of_birth: '2010-11-09',
      class_name: 'Grade 10',
      section: 'B',
      roll_number: '10B-01',
      phone: '+1 (555) 801-1103',
      email: 'aria.chen@student.pinkedu.edu',
      address: '290 Massachusetts Ave',
      city: 'Cambridge',
      previous_school: 'Belmont Day Academy',
      admission_date: '2026-03-05',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-03-05T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 4,
      student_id: 'STU-2026-004',
      admission_number: 'ADM-2026-104',
      student_name: 'Noah Alverez',
      father_name: 'Javier Alverez',
      mother_name: 'Elena Alverez',
      gender: 'Male',
      date_of_birth: '2011-02-19',
      class_name: 'Grade 9',
      section: 'A',
      roll_number: '09A-01',
      phone: '+1 (555) 801-1104',
      email: 'noah.alverez@student.pinkedu.edu',
      address: '54 Harvard Avenue',
      city: 'Brookline',
      previous_school: 'Brookline Oaks Middle',
      admission_date: '2026-04-12',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-04-12T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 5,
      student_id: 'STU-2026-005',
      admission_number: 'ADM-2026-105',
      student_name: 'Zara Siddiqui',
      father_name: 'Tariq Siddiqui',
      mother_name: 'Amina Siddiqui',
      gender: 'Female',
      date_of_birth: '2011-06-28',
      class_name: 'Grade 9',
      section: 'A',
      roll_number: '09A-02',
      phone: '+1 (555) 801-1105',
      email: 'zara.siddiqui@student.pinkedu.edu',
      address: '910 Boylston Street',
      city: 'Boston',
      previous_school: 'Windsor Girls Preparatory',
      admission_date: '2026-05-18',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-05-18T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 6,
      student_id: 'STU-2026-006',
      admission_number: 'ADM-2026-106',
      student_name: 'Ethan Vance-Sterling',
      father_name: 'logan Sterling',
      mother_name: 'Rachel Sterling',
      gender: 'Male',
      date_of_birth: '2011-09-04',
      class_name: 'Grade 9',
      section: 'B',
      roll_number: '09B-01',
      phone: '+1 (555) 801-1106',
      email: 'ethan.sterling@student.pinkedu.edu',
      address: '170 Tremont Street',
      city: 'Boston',
      previous_school: 'Commonwealth Academy',
      admission_date: '2026-06-08',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-06-08T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 7,
      student_id: 'STU-2026-007',
      admission_number: 'ADM-2026-107',
      student_name: 'Chloe Beauregard',
      father_name: 'Henri Beauregard',
      mother_name: 'Celine Beauregard',
      gender: 'Female',
      date_of_birth: '2012-01-25',
      class_name: 'Grade 8',
      section: 'A',
      roll_number: '08A-01',
      phone: '+1 (555) 801-1107',
      email: 'chloe.beauregard@student.pinkedu.edu',
      address: '33 Brattle Street',
      city: 'Cambridge',
      previous_school: 'French International School',
      admission_date: '2026-07-20',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-07-20T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 8,
      student_id: 'STU-2026-008',
      admission_number: 'ADM-2026-108',
      student_name: 'Lucas Montgomery',
      father_name: 'Patrick Montgomery',
      mother_name: 'Hannah Montgomery',
      gender: 'Male',
      date_of_birth: '2012-04-11',
      class_name: 'Grade 8',
      section: 'A',
      roll_number: '08A-02',
      phone: '+1 (555) 801-1108',
      email: 'lucas.montgomery@student.pinkedu.edu',
      address: '405 Marlborough Street',
      city: 'Boston',
      previous_school: 'Dexter Southfield',
      admission_date: '2026-08-14',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-08-14T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 9,
      student_id: 'STU-2026-009',
      admission_number: 'ADM-2026-109',
      student_name: 'Maya Lin-Park',
      father_name: 'Jin-Woo Park',
      mother_name: 'Grace Lin-Park',
      gender: 'Female',
      date_of_birth: '2013-03-17',
      class_name: 'Grade 7',
      section: 'A',
      roll_number: '07A-01',
      phone: '+1 (555) 801-1109',
      email: 'maya.linpark@student.pinkedu.edu',
      address: '122 Mt Auburn Street',
      city: 'Cambridge',
      previous_school: 'Fayerweather Street School',
      admission_date: '2026-09-02',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-09-02T09:00:00.000Z',
      updated_at: nowIso,
    },
    {
      id: 10,
      student_id: 'STU-2026-010',
      admission_number: 'ADM-2026-110',
      student_name: 'Oliver Sinclair',
      father_name: 'Benjamin Sinclair',
      mother_name: 'Eleanor Sinclair',
      gender: 'Male',
      date_of_birth: '2013-07-30',
      class_name: 'Grade 7',
      section: 'A',
      roll_number: '07A-02',
      phone: '+1 (555) 801-1110',
      email: 'oliver.sinclair@student.pinkedu.edu',
      address: '85 Centre Street',
      city: 'Brookline',
      previous_school: 'Pierce Elementary School',
      admission_date: '2026-09-10',
      profile_image: AVATAR_STUDENT,
      status: 'Active',
      created_at: '2026-09-10T09:00:00.000Z',
      updated_at: nowIso,
    },
  ];

  // Seed Student Attendance for today and recent dates
  const studentStatusesToday: AttendanceStatus[] = [
    'Present',
    'Present',
    'Present',
    'Late',
    'Present',
    'Absent',
    'Present',
    'Present',
    'Leave',
    'Present',
  ];

  const student_attendance: StudentAttendanceRow[] = [];
  let attId = 1;
  students.forEach((stu, idx) => {
    student_attendance.push({
      id: attId++,
      student_id: stu.id,
      attendance_date: today,
      class_name: stu.class_name,
      section: stu.section,
      status: studentStatusesToday[idx % studentStatusesToday.length],
      remarks:
        studentStatusesToday[idx % studentStatusesToday.length] === 'Absent'
          ? 'Parent notified via phone'
          : studentStatusesToday[idx % studentStatusesToday.length] === 'Late'
            ? 'School bus delay (12 mins)'
            : studentStatusesToday[idx % studentStatusesToday.length] === 'Leave'
              ? 'Approved medical appointment'
              : 'On time',
      marked_by: 1,
      created_at: nowIso,
      updated_at: nowIso,
    });
  });

  // Seed Teacher Attendance for today
  const teacherStatusesToday: AttendanceStatus[] = ['Present', 'Present', 'Present', 'Late', 'Present', 'Leave'];
  const teacher_attendance: TeacherAttendanceRow[] = teachers.map((t, idx) => ({
    id: idx + 1,
    teacher_id: t.id,
    attendance_date: today,
    status: teacherStatusesToday[idx],
    check_in_time: teacherStatusesToday[idx] === 'Leave' ? '--:--' : teacherStatusesToday[idx] === 'Late' ? '08:24 AM' : '07:52 AM',
    remarks: teacherStatusesToday[idx] === 'Leave' ? 'Approved academic conference leave' : 'Biometric verified',
    marked_by: 1,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  // Seed Student Fees across 3 months for rich charts & financial tracking
  const student_fees: StudentFeeRow[] = [
    {
      id: 1,
      invoice_number: 'INV-2026-0901',
      student_id: 1,
      class_name: 'Grade 10',
      fee_month: currentMonth,
      tuition_fee: 850,
      admission_fee: 0,
      transport_fee: 120,
      exam_fee: 80,
      other_fee: 30,
      discount: 50,
      total_amount: 1030,
      paid_amount: 1030,
      remaining_amount: 0,
      due_date: `${currentMonth}-15`,
      payment_date: `${currentMonth}-08`,
      payment_method: 'Online',
      status: 'Paid',
      notes: 'Full term installment cleared via online portal',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 2,
      invoice_number: 'INV-2026-0902',
      student_id: 2,
      class_name: 'Grade 10',
      fee_month: currentMonth,
      tuition_fee: 850,
      admission_fee: 0,
      transport_fee: 120,
      exam_fee: 80,
      other_fee: 0,
      discount: 0,
      total_amount: 1050,
      paid_amount: 600,
      remaining_amount: 450,
      due_date: `${currentMonth}-28`,
      payment_date: `${currentMonth}-10`,
      payment_method: 'Bank',
      status: 'Partial',
      notes: 'First installment paid; balance promised by month end',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 3,
      invoice_number: 'INV-2026-0903',
      student_id: 3,
      class_name: 'Grade 10',
      fee_month: currentMonth,
      tuition_fee: 850,
      admission_fee: 0,
      transport_fee: 0,
      exam_fee: 80,
      other_fee: 40,
      discount: 70,
      total_amount: 900,
      paid_amount: 900,
      remaining_amount: 0,
      due_date: `${currentMonth}-15`,
      payment_date: `${currentMonth}-05`,
      payment_method: 'Bank',
      status: 'Paid',
      notes: 'Merit scholarship discount applied',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 4,
      invoice_number: 'INV-2026-0904',
      student_id: 4,
      class_name: 'Grade 9',
      fee_month: currentMonth,
      tuition_fee: 780,
      admission_fee: 0,
      transport_fee: 110,
      exam_fee: 60,
      other_fee: 20,
      discount: 0,
      total_amount: 970,
      paid_amount: 0,
      remaining_amount: 970,
      due_date: `${currentMonth}-30`,
      payment_date: null,
      payment_method: null,
      status: 'Pending',
      notes: 'Invoice dispatched to guardian email',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 5,
      invoice_number: 'INV-2026-0905',
      student_id: 5,
      class_name: 'Grade 9',
      fee_month: currentMonth,
      tuition_fee: 780,
      admission_fee: 0,
      transport_fee: 110,
      exam_fee: 60,
      other_fee: 0,
      discount: 50,
      total_amount: 900,
      paid_amount: 900,
      remaining_amount: 0,
      due_date: `${currentMonth}-15`,
      payment_date: `${currentMonth}-11`,
      payment_method: 'Cash',
      status: 'Paid',
      notes: 'Paid at bursar counter',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 6,
      invoice_number: 'INV-2026-0906',
      student_id: 6,
      class_name: 'Grade 9',
      fee_month: currentMonth,
      tuition_fee: 780,
      admission_fee: 0,
      transport_fee: 0,
      exam_fee: 60,
      other_fee: 25,
      discount: 0,
      total_amount: 865,
      paid_amount: 400,
      remaining_amount: 465,
      due_date: `${currentMonth}-29`,
      payment_date: `${currentMonth}-14`,
      payment_method: 'Online',
      status: 'Partial',
      notes: 'Partial payment received via ACH',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 7,
      invoice_number: 'INV-2026-0801',
      student_id: 1,
      class_name: 'Grade 10',
      fee_month: prevMonth,
      tuition_fee: 850,
      admission_fee: 0,
      transport_fee: 120,
      exam_fee: 0,
      other_fee: 30,
      discount: 50,
      total_amount: 950,
      paid_amount: 950,
      remaining_amount: 0,
      due_date: `${prevMonth}-15`,
      payment_date: `${prevMonth}-09`,
      payment_method: 'Online',
      status: 'Paid',
      notes: 'August tuition settled',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 8,
      invoice_number: 'INV-2026-0701',
      student_id: 7,
      class_name: 'Grade 8',
      fee_month: twoMonthsAgo,
      tuition_fee: 720,
      admission_fee: 250,
      transport_fee: 100,
      exam_fee: 0,
      other_fee: 30,
      discount: 0,
      total_amount: 1100,
      paid_amount: 1100,
      remaining_amount: 0,
      due_date: `${twoMonthsAgo}-15`,
      payment_date: `${twoMonthsAgo}-12`,
      payment_method: 'Bank',
      status: 'Paid',
      notes: 'Admission + July tuition fee',
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  const fee_payments: FeePaymentRow[] = [
    {
      id: 1,
      receipt_number: 'RCP-2026-5001',
      fee_id: 1,
      student_id: 1,
      amount: 1030,
      payment_date: `${currentMonth}-08`,
      payment_method: 'Online',
      reference_no: 'TXN-9948120',
      notes: 'Full payment for September invoice',
      received_by: 2,
      created_at: nowIso,
    },
    {
      id: 2,
      receipt_number: 'RCP-2026-5002',
      fee_id: 2,
      student_id: 2,
      amount: 600,
      payment_date: `${currentMonth}-10`,
      payment_method: 'Bank',
      reference_no: 'BNK-7723104',
      notes: 'Installment 1 of 2',
      received_by: 2,
      created_at: nowIso,
    },
    {
      id: 3,
      receipt_number: 'RCP-2026-5003',
      fee_id: 3,
      student_id: 3,
      amount: 900,
      payment_date: `${currentMonth}-05`,
      payment_method: 'Bank',
      reference_no: 'BNK-7719002',
      notes: 'Cleared via wire transfer',
      received_by: 2,
      created_at: nowIso,
    },
    {
      id: 4,
      receipt_number: 'RCP-2026-5004',
      fee_id: 5,
      student_id: 5,
      amount: 900,
      payment_date: `${currentMonth}-11`,
      payment_method: 'Cash',
      reference_no: 'CSH-1094',
      notes: 'Paid in person at accounting desk',
      received_by: 2,
      created_at: nowIso,
    },
    {
      id: 5,
      receipt_number: 'RCP-2026-5005',
      fee_id: 6,
      student_id: 6,
      amount: 400,
      payment_date: `${currentMonth}-14`,
      payment_method: 'Online',
      reference_no: 'TXN-9981044',
      notes: 'Partial online payment',
      received_by: 2,
      created_at: nowIso,
    },
    {
      id: 6,
      receipt_number: 'RCP-2026-4901',
      fee_id: 7,
      student_id: 1,
      amount: 950,
      payment_date: `${prevMonth}-09`,
      payment_method: 'Online',
      reference_no: 'TXN-8841200',
      notes: 'August tuition payment',
      received_by: 2,
      created_at: nowIso,
    },
    {
      id: 7,
      receipt_number: 'RCP-2026-4801',
      fee_id: 8,
      student_id: 7,
      amount: 1100,
      payment_date: `${twoMonthsAgo}-12`,
      payment_method: 'Bank',
      reference_no: 'BNK-6612098',
      notes: 'July admission and tuition',
      received_by: 2,
      created_at: nowIso,
    },
  ];

  const teacher_salaries: TeacherSalaryRow[] = [
    {
      id: 1,
      slip_number: 'SLP-2026-0901',
      teacher_id: 1,
      employee_id: 'EMP-2026-001',
      salary_month: currentMonth,
      basic_salary: 4800,
      bonus: 350,
      deduction: 100,
      net_salary: 5050,
      paid_amount: 5050,
      remaining_salary: 0,
      payment_date: `${currentMonth}-25`,
      payment_method: 'Bank',
      status: 'Paid',
      notes: 'Includes STEM lab coordinator stipend',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 2,
      slip_number: 'SLP-2026-0902',
      teacher_id: 2,
      employee_id: 'EMP-2026-002',
      salary_month: currentMonth,
      basic_salary: 4400,
      bonus: 200,
      deduction: 50,
      net_salary: 4550,
      paid_amount: 4550,
      remaining_salary: 0,
      payment_date: `${currentMonth}-25`,
      payment_method: 'Bank',
      status: 'Paid',
      notes: 'Monthly payroll direct deposit',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 3,
      slip_number: 'SLP-2026-0903',
      teacher_id: 3,
      employee_id: 'EMP-2026-003',
      salary_month: currentMonth,
      basic_salary: 5200,
      bonus: 400,
      deduction: 120,
      net_salary: 5480,
      paid_amount: 3000,
      remaining_salary: 2480,
      payment_date: `${currentMonth}-25`,
      payment_method: 'Bank',
      status: 'Partial',
      notes: 'Advance disbursed; balance queued for 30th',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 4,
      slip_number: 'SLP-2026-0904',
      teacher_id: 4,
      employee_id: 'EMP-2026-004',
      salary_month: currentMonth,
      basic_salary: 4600,
      bonus: 150,
      deduction: 0,
      net_salary: 4750,
      paid_amount: 0,
      remaining_salary: 4750,
      payment_date: null,
      payment_method: null,
      status: 'Pending',
      notes: 'Pending end-of-month payroll batch approval',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 5,
      slip_number: 'SLP-2026-0801',
      teacher_id: 1,
      employee_id: 'EMP-2026-001',
      salary_month: prevMonth,
      basic_salary: 4800,
      bonus: 200,
      deduction: 100,
      net_salary: 4900,
      paid_amount: 4900,
      remaining_salary: 0,
      payment_date: `${prevMonth}-26`,
      payment_method: 'Bank',
      status: 'Paid',
      notes: 'August payroll settled',
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  const salary_payments: SalaryPaymentRow[] = [
    {
      id: 1,
      voucher_number: 'VCH-2026-901',
      salary_id: 1,
      teacher_id: 1,
      amount: 5050,
      payment_date: `${currentMonth}-25`,
      payment_method: 'Bank',
      notes: 'September full salary disbursement',
      processed_by: 1,
      created_at: nowIso,
    },
    {
      id: 2,
      voucher_number: 'VCH-2026-902',
      salary_id: 2,
      teacher_id: 2,
      amount: 4550,
      payment_date: `${currentMonth}-25`,
      payment_method: 'Bank',
      notes: 'September full salary disbursement',
      processed_by: 1,
      created_at: nowIso,
    },
    {
      id: 3,
      voucher_number: 'VCH-2026-903',
      salary_id: 3,
      teacher_id: 3,
      amount: 3000,
      payment_date: `${currentMonth}-25`,
      payment_method: 'Bank',
      notes: 'September partial salary advance',
      processed_by: 1,
      created_at: nowIso,
    },
    {
      id: 4,
      voucher_number: 'VCH-2026-801',
      salary_id: 5,
      teacher_id: 1,
      amount: 4900,
      payment_date: `${prevMonth}-26`,
      payment_method: 'Bank',
      notes: 'August full salary disbursement',
      processed_by: 1,
      created_at: nowIso,
    },
  ];

  return {
    users,
    teachers,
    classes,
    subjects,
    students,
    student_attendance,
    teacher_attendance,
    student_fees,
    fee_payments,
    teacher_salaries,
    salary_payments,
  };
}

class RelationalDatabaseEngine {
  private store: DatabaseStore;
  private pool: Pool | null = null;
  private connectPromise: Promise<void> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.store = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseStore {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseStore;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.students)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database store, initializing seed store:', err);
    }
    return buildInitialSeedData();
  }

  public async connect(): Promise<void> {
    if (this.pool) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.initializeConnection();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async initializeConnection(): Promise<void> {
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const port = Number(process.env.MYSQL_PORT) || 3306;
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || 'mydatabase';

    if (process.env.MYSQL_CREATE_DATABASE !== 'false') {
      const setupConnection = await mysql.createConnection({ host, port, user, password });
      try {
        await setupConnection.query(
          `CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
      } finally {
        await setupConnection.end();
      }
    }

    const pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pinkedu_state (
          id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
          payload JSON NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
      `);
      const [rows] = await pool.query<(RowDataPacket & { payload: DatabaseStore | string })[]>(
        'SELECT payload FROM pinkedu_state WHERE id = 1'
      );

      if (rows.length > 0) {
        const payload = rows[0].payload;
        this.store = typeof payload === 'string' ? JSON.parse(payload) as DatabaseStore : payload;
      } else {
        await pool.execute(
          'INSERT INTO pinkedu_state (id, payload) VALUES (1, CAST(? AS JSON))',
          [JSON.stringify(this.store)]
        );
      }

      this.pool = pool;
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  public getStore(): DatabaseStore {
    return this.store;
  }

  public async commit(): Promise<void> {
    if (!this.pool) {
      throw new Error('MySQL database is not connected');
    }

    const snapshot = JSON.stringify(this.store);
    this.saveQueue = this.saveQueue.then(async () => {
      await this.pool!.execute(
        `INSERT INTO pinkedu_state (id, payload) VALUES (1, CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE payload = CAST(? AS JSON)`,
        [snapshot, snapshot]
      );
    });
    await this.saveQueue;
  }

  public async transaction<T>(fn: (store: DatabaseStore) => T): Promise<T> {
    const snapshot = JSON.stringify(this.store);
    try {
      const result = fn(this.store);
      await this.commit();
      return result;
    } catch (err) {
      this.store = JSON.parse(snapshot) as DatabaseStore;
      throw err;
    }
  }

  public nextId<K extends keyof DatabaseStore>(table: K): number {
    const rows = this.store[table] as Array<{ id: number }>;
    if (rows.length === 0) return 1;
    return Math.max(...rows.map((r) => r.id)) + 1;
  }

  public resetToSeed(): void {
    this.store = buildInitialSeedData();
    this.commit();
  }
}

export const db = new RelationalDatabaseEngine();
