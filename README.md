# PinkEdu — Industry-Level School Management System

## 1. Project Overview
**PinkEdu** is a full-stack School Management System (ERP/SaaS) designed for educational institutions. It provides a modern, responsive pink-themed workspace for managing students, teachers, classes, subjects, student & teacher attendance, student fee invoicing & receipts, teacher salary payroll, role-based user access control, and institutional reports.

## 2. Technologies
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React
- **Backend**: Node.js, Express.js, TypeScript (`tsx`), REST API architecture, HMAC-SHA256 JWT Authentication, Salted `scrypt` password hashing, Role-Based Access Control (RBAC)
- **Database**: MySQL-backed application state, loaded at startup and persisted to the `pinkedu_state` JSON column table; `backend/database/schema.sql` contains the optional normalized relational schema reference.

## 3. Features
- **Executive Dashboard**: 10 live database KPIs, Monthly Admissions AreaChart, Students by Class BarChart, Gender Ratio PieChart, Attendance Breakdown, Monthly Cashflow & Payroll BarChart, Recent Registrations, Recent Fee Payments, Upcoming Fee Deadlines, and Recent Attendance.
- **Role-Based Authentication**: Admin, Accountant, and Teacher roles with JWT session management, password hashing, profile management, and 1-click role switching.
- **Student Management**: Full CRUD, search, filter by class/section/status, sort, pagination, photo upload, CSV export, print directory, and comprehensive Student Dossier Modal (Personal, Parent, Academic, Attendance Summary, Fee Invoices, Payment Receipts).
- **Teacher Management**: Full CRUD, search, filter, photo upload, and Teacher Profile Modal (Qualifications, Assigned Classes/Subjects, Attendance Log, Salary History).
- **Student & Teacher Attendance**: Daily attendance marking (`Present`, `Absent`, `Late`, `Leave`), duplicate prevention per date, attendance percentage calculation, and monthly history.
- **Student Fees Management**: Automatic formula calculation (`Total = Tuition + Admission + Transport + Exam + Other - Discount`, `Remaining = Total - Paid`), partial/full payment recording (`Cash`, `Bank`, `Online`), and official printable Fee Receipts.
- **Teacher Salary Management**: Automatic formula calculation (`Net Salary = Basic + Bonus - Deduction`), salary disbursement tracking, and printable Faculty Salary Slips.
- **Class & Subject Management**: Grade sections, room numbers, capacities, class roster viewer, curriculum subject codes, and teacher assignments.
- **Institutional Reports**: Student, Attendance, and Financial reports with date range filtering, Print, PDF export, and Excel (CSV) export.

## 4. Folder Structure
```text
/
├── backend/
│   ├── database/
│   │   ├── schema.sql               # Complete MySQL 8.0 relational DDL schema (11 tables)
│   │   └── pinkedu_store.json       # Persistent relational database store
│   └── src/
│       ├── config/
│       │   └── db.ts                # Relational engine, transactions, JWT & scrypt crypto, seed data
│       ├── controllers/
│       │   ├── academicController.ts
│       │   ├── attendanceController.ts
│       │   ├── authController.ts
│       │   ├── dashboardController.ts
│       │   ├── financeController.ts
│       │   ├── reportController.ts
│       │   ├── studentController.ts
│       │   └── teacherController.ts
│       ├── middleware/
│       │   └── auth.ts              # JWT authentication & role authorization middleware
│       └── routes/
│           └── api.ts               # REST API routes
├── src/
│   ├── components/
│   │   ├── ui/AvatarImage.tsx
│   │   ├── AcademicModule.tsx
│   │   ├── AttendanceModule.tsx
│   │   ├── DashboardModule.tsx
│   │   ├── FeesModule.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ReportsModule.tsx
│   │   ├── SalariesModule.tsx
│   │   ├── SettingsUsersModule.tsx
│   │   ├── StudentsModule.tsx
│   │   └── TeachersModule.tsx
│   ├── context/AuthContext.tsx
│   ├── services/api.ts
│   ├── utils/exportUtils.ts
│   ├── App.tsx
│   └── main.tsx
└── server.ts                        # Full-stack Express + Vite server entry point
```

## 5. MySQL Installation & Database Creation
Create the MySQL database (the default local configuration uses `mydatabase`):
```sql
CREATE DATABASE mydatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
The backend creates its `pinkedu_state` table on startup. If that table is empty, the current `backend/database/pinkedu_store.json` is imported once; later changes are persisted in MySQL.

## 6. Environment Variables
Configure in `.env`:
```env
JWT_SECRET="pinkedu-enterprise-jwt-secret-key-2026"
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=mydatabase
```

## 7. Running the Project
```bash
npm install
npm run build
npm run dev
```
The full-stack server starts on `http://localhost:3000`.

## 8. Default Role Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@pinkedu.edu` | `Admin@123` |
| **Accountant** | `accountant@pinkedu.edu` | `Finance@123` |
| **Teacher** | `teacher@pinkedu.edu` | `Teacher@123` |
