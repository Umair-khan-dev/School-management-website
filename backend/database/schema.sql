-- ============================================================================
-- PinkEdu — Industry-Level School Management System
-- Relational Database Schema (MySQL 8.0+)
-- Normalized 3NF Relational Design with Foreign Keys, Unique Constraints & Indexes
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pinkedu_sms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pinkedu_sms;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE (Authentication & Role-Based Access Control)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Accountant', 'Teacher') NOT NULL DEFAULT 'Teacher',
  phone VARCHAR(30) DEFAULT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  linked_teacher_id INT UNSIGNED DEFAULT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  last_login_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. TEACHERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(32) NOT NULL UNIQUE,
  teacher_name VARCHAR(120) NOT NULL,
  father_name VARCHAR(120) NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  date_of_birth DATE NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  qualification VARCHAR(160) NOT NULL,
  subject_specialization VARCHAR(100) NOT NULL,
  assigned_class VARCHAR(60) NOT NULL,
  joining_date DATE NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  profile_image VARCHAR(500) DEFAULT NULL,
  status ENUM('Active', 'On Leave', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teachers_status (status),
  INDEX idx_teachers_subject (subject_specialization),
  INDEX idx_teachers_name (teacher_name)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. CLASSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(60) NOT NULL,
  section VARCHAR(20) NOT NULL,
  class_teacher_id INT UNSIGNED DEFAULT NULL,
  room_number VARCHAR(30) NOT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 35,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_class_section (class_name, section),
  INDEX idx_classes_status (status),
  CONSTRAINT fk_classes_teacher
    FOREIGN KEY (class_teacher_id) REFERENCES teachers(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. SUBJECTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_name VARCHAR(120) NOT NULL,
  subject_code VARCHAR(30) NOT NULL UNIQUE,
  class_name VARCHAR(60) NOT NULL,
  teacher_id INT UNSIGNED DEFAULT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subjects_class (class_name),
  INDEX idx_subjects_status (status),
  CONSTRAINT fk_subjects_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. STUDENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL UNIQUE,
  admission_number VARCHAR(40) NOT NULL UNIQUE,
  student_name VARCHAR(120) NOT NULL,
  father_name VARCHAR(120) NOT NULL,
  mother_name VARCHAR(120) NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  date_of_birth DATE NOT NULL,
  class_name VARCHAR(60) NOT NULL,
  section VARCHAR(20) NOT NULL,
  roll_number VARCHAR(20) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  previous_school VARCHAR(160) DEFAULT NULL,
  admission_date DATE NOT NULL,
  profile_image VARCHAR(500) DEFAULT NULL,
  status ENUM('Active', 'Inactive', 'Graduated', 'Transferred') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_class_section_roll (class_name, section, roll_number),
  INDEX idx_students_class_section (class_name, section),
  INDEX idx_students_status (status),
  INDEX idx_students_name (student_name),
  INDEX idx_students_admission_date (admission_date)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. STUDENT ATTENDANCE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  class_name VARCHAR(60) NOT NULL,
  section VARCHAR(20) NOT NULL,
  status ENUM('Present', 'Absent', 'Late', 'Leave') NOT NULL DEFAULT 'Present',
  remarks VARCHAR(255) DEFAULT NULL,
  marked_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_attendance_date (student_id, attendance_date),
  INDEX idx_student_att_date_class (attendance_date, class_name, section),
  INDEX idx_student_att_status (status),
  CONSTRAINT fk_student_att_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_att_user
    FOREIGN KEY (marked_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. TEACHER ATTENDANCE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present', 'Absent', 'Late', 'Leave') NOT NULL DEFAULT 'Present',
  check_in_time VARCHAR(20) DEFAULT NULL,
  remarks VARCHAR(255) DEFAULT NULL,
  marked_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_teacher_attendance_date (teacher_id, attendance_date),
  INDEX idx_teacher_att_date (attendance_date),
  INDEX idx_teacher_att_status (status),
  CONSTRAINT fk_teacher_att_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_teacher_att_user
    FOREIGN KEY (marked_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. STUDENT FEES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_fees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  class_name VARCHAR(60) NOT NULL,
  fee_month VARCHAR(20) NOT NULL, -- Format: YYYY-MM
  tuition_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  admission_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  transport_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  exam_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  other_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  remaining_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  payment_date DATE DEFAULT NULL,
  payment_method ENUM('Cash', 'Bank', 'Online') DEFAULT NULL,
  status ENUM('Paid', 'Partial', 'Pending') NOT NULL DEFAULT 'Pending',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_fee_month (student_id, fee_month),
  INDEX idx_student_fees_status (status),
  INDEX idx_student_fees_month (fee_month),
  INDEX idx_student_fees_due_date (due_date),
  CONSTRAINT fk_student_fees_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. FEE PAYMENTS TABLE (Audit Trail & Receipts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(40) NOT NULL UNIQUE,
  fee_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('Cash', 'Bank', 'Online') NOT NULL DEFAULT 'Cash',
  reference_no VARCHAR(80) DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  received_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fee_payments_date (payment_date),
  CONSTRAINT fk_fee_payments_fee
    FOREIGN KEY (fee_id) REFERENCES student_fees(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fee_payments_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. TEACHER SALARIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_salaries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slip_number VARCHAR(40) NOT NULL UNIQUE,
  teacher_id INT UNSIGNED NOT NULL,
  employee_id VARCHAR(32) NOT NULL,
  salary_month VARCHAR(20) NOT NULL, -- Format: YYYY-MM
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  bonus DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  deduction DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  remaining_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  payment_date DATE DEFAULT NULL,
  payment_method ENUM('Cash', 'Bank', 'Online') DEFAULT NULL,
  status ENUM('Paid', 'Partial', 'Pending') NOT NULL DEFAULT 'Pending',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_teacher_salary_month (teacher_id, salary_month),
  INDEX idx_teacher_salaries_status (status),
  INDEX idx_teacher_salaries_month (salary_month),
  CONSTRAINT fk_teacher_salaries_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. SALARY PAYMENTS TABLE (Disbursement Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  voucher_number VARCHAR(40) NOT NULL UNIQUE,
  salary_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('Cash', 'Bank', 'Online') NOT NULL DEFAULT 'Bank',
  notes VARCHAR(255) DEFAULT NULL,
  processed_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salary_payments_date (payment_date),
  CONSTRAINT fk_salary_payments_salary
    FOREIGN KEY (salary_id) REFERENCES teacher_salaries(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salary_payments_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
