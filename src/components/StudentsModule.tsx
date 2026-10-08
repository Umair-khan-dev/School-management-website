import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarImage } from './ui/AvatarImage';
import { exportToCsv, triggerPrintDocument } from '../utils/exportUtils';
import {
  Search,
  Plus,
  Download,
  Printer,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
} from 'lucide-react';

const CLASS_OPTIONS = ['Grade 10', 'Grade 9', 'Grade 8', 'Grade 7'];
const SECTION_OPTIONS = ['A', 'B'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Graduated', 'Transferred'];

const INITIAL_FORM = {
  student_id: '',
  admission_number: '',
  student_name: '',
  father_name: '',
  mother_name: '',
  gender: 'Female',
  date_of_birth: '2011-05-15',
  class_name: 'Grade 10',
  section: 'A',
  roll_number: '',
  phone: '',
  email: '',
  address: '',
  city: 'Boston',
  previous_school: '',
  admission_date: new Date().toISOString().slice(0, 10),
  profile_image: '/src/assets/images/avatar_student_scholar_1790499608419.jpg',
  status: 'Active',
};

export const StudentsModule: React.FC = () => {
  const { user, showToast } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sortBy, setSortBy] = useState('student_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1,
  });

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Student Full Profile Modal State
  const [profileDetail, setProfileDetail] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/students', {
        params: {
          search: debouncedSearch,
          class_name: classFilter,
          section: sectionFilter,
          status: statusFilter,
          gender: genderFilter,
          sortBy,
          sortOrder,
          page,
          limit: 8,
        },
      });
      setStudents(res.students || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 8, totalPages: 1 });
    } catch (err: any) {
      showToast(err.message || 'Unable to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, classFilter, sectionFilter, statusFilter, genderFilter, sortBy, sortOrder, page, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      ...INITIAL_FORM,
      student_id: `STU-2026-${String(pagination.total + 11).padStart(3, '0')}`,
      admission_number: `ADM-2026-${String(110 + pagination.total + 1)}`,
      roll_number: `10A-${String(pagination.total + 1).padStart(2, '0')}`,
    });
    setModalOpen(true);
  };

  const openEditModal = (stu: any) => {
    setEditingStudent(stu);
    setFormData({
      student_id: stu.student_id || '',
      admission_number: stu.admission_number || '',
      student_name: stu.student_name || '',
      father_name: stu.father_name || '',
      mother_name: stu.mother_name || '',
      gender: stu.gender || 'Female',
      date_of_birth: stu.date_of_birth || '2011-01-01',
      class_name: stu.class_name || 'Grade 10',
      section: stu.section || 'A',
      roll_number: stu.roll_number || '',
      phone: stu.phone || '',
      email: stu.email || '',
      address: stu.address || '',
      city: stu.city || 'Boston',
      previous_school: stu.previous_school || '',
      admission_date: stu.admission_date || '',
      profile_image:
        stu.profile_image || '/src/assets/images/avatar_student_scholar_1790499608419.jpg',
      status: stu.status || 'Active',
    });
    setModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, profile_image: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStudent) {
        const res = await apiRequest(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        showToast(res.message || 'Student updated successfully', 'success');
      } else {
        const res = await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        showToast(res.message || 'Student added successfully', 'success');
      }
      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      showToast(err.message || 'Unable to save student', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiRequest(`/api/students/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      showToast(res.message || 'Student deleted successfully', 'success');
      setDeleteTarget(null);
      fetchStudents();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete student', 'error');
    }
  };

  const openStudentProfile = async (stuId: number) => {
    setProfileLoading(true);
    try {
      const res = await apiRequest(`/api/students/${stuId}`);
      setProfileDetail(res);
    } catch (err: any) {
      showToast(err.message || 'Unable to load student profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExportStudents = () => {
    if (students.length === 0) {
      showToast('No student records to export', 'info');
      return;
    }
    exportToCsv(
      'pinkedu_students_directory',
      students.map((s) => ({
        Student_ID: s.student_id,
        Admission_No: s.admission_number,
        Name: s.student_name,
        Father_Name: s.father_name,
        Mother_Name: s.mother_name,
        Gender: s.gender,
        DOB: s.date_of_birth,
        Class: s.class_name,
        Section: s.section,
        Roll_No: s.roll_number,
        Phone: s.phone,
        Email: s.email,
        City: s.city,
        Admission_Date: s.admission_date,
        Status: s.status,
      }))
    );
    showToast('Student records exported to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive student enrollment directory, academic profiles, attendance summaries, and
            fee ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={handleExportStudents}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-600" />
            <span>Export Records</span>
          </button>
          <button
            onClick={triggerPrintDocument}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-pink-600" />
            <span>Print Directory</span>
          </button>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Search, Filters & Sort Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 no-print">
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, ID, roll no, father, phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-pink-600"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-pink-600"
        >
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sectionFilter}
          onChange={(e) => {
            setSectionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-pink-600"
        >
          <option value="">All Sections</option>
          {SECTION_OPTIONS.map((sec) => (
            <option key={sec} value={sec}>
              Section {sec}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-pink-600"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [field, ord] = e.target.value.split(':');
            setSortBy(field);
            setSortOrder(ord as 'asc' | 'desc');
          }}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-pink-600"
        >
          <option value="student_name:asc">Sort: Name (A–Z)</option>
          <option value="student_name:desc">Sort: Name (Z–A)</option>
          <option value="admission_date:desc">Sort: Newest Admitted</option>
          <option value="roll_number:asc">Sort: Roll Number</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Scholar & ID</th>
                <th className="py-3 px-4">Class & Roll</th>
                <th className="py-3 px-4">Parents</th>
                <th className="py-3 px-4">Contact & City</th>
                <th className="py-3 px-4">Admitted & Status</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-40 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-20 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4" />
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">No matching students found</p>
                    <p className="text-xs">
                      Adjust your search or class filters, or admit a new student.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarImage src={stu.profile_image} name={stu.student_name} size="md" />
                        <div>
                          <button
                            onClick={() => openStudentProfile(stu.id)}
                            className="font-semibold text-slate-900 hover:text-pink-600 text-left cursor-pointer"
                          >
                            {stu.student_name}
                          </button>
                          <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                            {stu.student_id} · {stu.admission_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">
                        {stu.class_name} · Sec {stu.section}
                      </p>
                      <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                        Roll #{stu.roll_number} · {stu.gender}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <p className="text-slate-800 font-medium">F: {stu.father_name}</p>
                      <p className="text-slate-500 mt-0.5">M: {stu.mother_name || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-slate-800 tabular-nums">{stu.phone}</p>
                      <p className="text-slate-500 mt-0.5">
                        {stu.city} · {stu.email}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-slate-700 tabular-nums">{stu.admission_date}</p>
                      <p
                        className={`font-semibold mt-0.5 ${
                          stu.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {stu.status}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openStudentProfile(stu.id)}
                          className="p-1.5 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors cursor-pointer"
                          title="View Student Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(stu)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit Student"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(stu)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 no-print">
          <div className="font-mono tabular-nums">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total
            records)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingStudent ? 'Edit Student Record' : 'Admit New Student'}
                </h2>
                <p className="text-xs text-slate-500">
                  Complete all academic, guardian, and contact details.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {/* Photo Upload Row */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <AvatarImage
                  src={formData.profile_image}
                  name={formData.student_name || 'Student'}
                  size="lg"
                />
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-md cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Student Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Supports JPG/PNG portrait or defaults to official scholar avatar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.admission_number}
                    onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    placeholder="e.g. Sophia Kensington"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Father&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mother&apos;s Name
                  </label>
                  <input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class *
                  </label>
                  <select
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section *
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {SECTION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    placeholder="10A-05"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="scholar@student.pinkedu.edu"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previous School
                  </label>
                  <input
                    type="text"
                    value={formData.previous_school}
                    onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  {saving
                    ? 'Saving...'
                    : editingStudent
                      ? 'Update Student'
                      : 'Complete Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Confirm Student Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <span className="font-semibold text-slate-900">{deleteTarget.student_name}</span> (
              <span className="font-mono">{deleteTarget.student_id}</span>) and their associated
              attendance and fee records?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Full Profile Details Modal (Personal, Parent, Academic, Attendance, Fee & Payment History) */}
      {(profileLoading || profileDetail) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-6 space-y-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            {profileLoading || !profileDetail ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading complete student dossier...
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <AvatarImage
                      src={profileDetail.student.profile_image}
                      name={profileDetail.student.student_name}
                      size="xl"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {profileDetail.student.student_name}
                      </h2>
                      <p className="text-xs font-mono text-slate-500 tabular-nums mt-0.5">
                        {profileDetail.student.student_id} · Adm #
                        {profileDetail.student.admission_number} · Roll #
                        {profileDetail.student.roll_number}
                      </p>
                      <p className="text-xs text-pink-700 font-semibold mt-1">
                        {profileDetail.student.class_name} — Section{' '}
                        {profileDetail.student.section} · {profileDetail.student.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <button
                      onClick={triggerPrintDocument}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Profile</span>
                    </button>
                    <button
                      onClick={() => setProfileDetail(null)}
                      className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Personal, Parent & Academic Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-2 border-r border-slate-100 pr-4">
                    <h3 className="font-bold text-slate-900 text-sm">Personal Information</h3>
                    <p className="text-slate-600">
                      Gender:{' '}
                      <span className="font-semibold text-slate-900">
                        {profileDetail.student.gender}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Date of Birth:{' '}
                      <span className="font-mono text-slate-900 tabular-nums">
                        {profileDetail.student.date_of_birth}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Phone:{' '}
                      <span className="font-mono text-slate-900 tabular-nums">
                        {profileDetail.student.phone}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Email:{' '}
                      <span className="text-slate-900">{profileDetail.student.email}</span>
                    </p>
                    <p className="text-slate-600">
                      Address:{' '}
                      <span className="text-slate-900">
                        {profileDetail.student.address}, {profileDetail.student.city}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2 border-r border-slate-100 pr-4">
                    <h3 className="font-bold text-slate-900 text-sm">Parent / Guardian Info</h3>
                    <p className="text-slate-600">
                      Father&apos;s Name:{' '}
                      <span className="font-semibold text-slate-900">
                        {profileDetail.student.father_name}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Mother&apos;s Name:{' '}
                      <span className="font-semibold text-slate-900">
                        {profileDetail.student.mother_name || '—'}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Primary Contact:{' '}
                      <span className="font-mono text-slate-900 tabular-nums">
                        {profileDetail.student.phone}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm">Academic & Attendance</h3>
                    <p className="text-slate-600">
                      Admission Date:{' '}
                      <span className="font-mono text-slate-900 tabular-nums">
                        {profileDetail.student.admission_date}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Previous School:{' '}
                      <span className="text-slate-900">
                        {profileDetail.student.previous_school || '—'}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Attendance Rate:{' '}
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        {profileDetail.attendanceSummary.attendancePercentage}%
                      </span>
                    </p>
                    <p className="font-mono text-slate-500 tabular-nums">
                      Present: {profileDetail.attendanceSummary.presentCount} · Absent:{' '}
                      {profileDetail.attendanceSummary.absentCount} · Late:{' '}
                      {profileDetail.attendanceSummary.lateCount} · Leave:{' '}
                      {profileDetail.attendanceSummary.leaveCount}
                    </p>
                  </div>
                </div>

                {/* Fee History & Payment History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Fee Invoices</h3>
                    {profileDetail.feeHistory.length === 0 ? (
                      <p className="text-xs text-slate-500">No fee invoices recorded.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                              <th className="py-2 px-3">Invoice / Month</th>
                              <th className="py-2 px-3 text-right">Total</th>
                              <th className="py-2 px-3 text-right">Balance</th>
                              <th className="py-2 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                            {profileDetail.feeHistory.map((f: any) => (
                              <tr key={f.id}>
                                <td className="py-2 px-3">
                                  {f.invoice_number} · {f.fee_month}
                                </td>
                                <td className="py-2 px-3 text-right">${f.total_amount}</td>
                                <td className="py-2 px-3 text-right text-rose-600">
                                  ${f.remaining_amount}
                                </td>
                                <td className="py-2 px-3 text-right font-sans font-semibold">
                                  {f.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Payment Receipts</h3>
                    {profileDetail.paymentHistory.length === 0 ? (
                      <p className="text-xs text-slate-500">No fee payments recorded yet.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                              <th className="py-2 px-3">Receipt</th>
                              <th className="py-2 px-3">Date & Method</th>
                              <th className="py-2 px-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                            {profileDetail.paymentHistory.map((p: any) => (
                              <tr key={p.id}>
                                <td className="py-2 px-3">{p.receipt_number}</td>
                                <td className="py-2 px-3">
                                  {p.payment_date} · {p.payment_method}
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                                  ${p.amount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
