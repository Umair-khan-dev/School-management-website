import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarImage } from './ui/AvatarImage';
import { exportToCsv } from '../utils/exportUtils';
import {
  Search,
  Plus,
  Download,
  Eye,
  Edit2,
  Trash2,
  X,
  Upload,
} from 'lucide-react';

const INITIAL_TEACHER_FORM = {
  employee_id: '',
  teacher_name: '',
  father_name: '',
  gender: 'Female',
  date_of_birth: '1988-06-15',
  phone: '',
  email: '',
  address: '',
  qualification: 'M.Sc., B.Ed.',
  subject_specialization: '',
  assigned_class: 'Grade 10',
  joining_date: new Date().toISOString().slice(0, 10),
  basic_salary: 4500,
  profile_image: '/src/assets/images/avatar_teacher_science_1790499596793.jpg',
  status: 'Active',
};

export const TeachersModule: React.FC = () => {
  const { user, showToast } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [formData, setFormData] = useState(INITIAL_TEACHER_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [profileDetail, setProfileDetail] = useState<any | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/teachers', {
        params: { search: debouncedSearch, status: statusFilter },
      });
      setTeachers(res.teachers || []);
    } catch (err: any) {
      showToast(err.message || 'Unable to fetch teachers', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, showToast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFormData({
      ...INITIAL_TEACHER_FORM,
      employee_id: `EMP-2026-${String(teachers.length + 10).padStart(3, '0')}`,
    });
    setModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingTeacher(t);
    setFormData({
      employee_id: t.employee_id || '',
      teacher_name: t.teacher_name || '',
      father_name: t.father_name || '',
      gender: t.gender || 'Female',
      date_of_birth: t.date_of_birth || '1988-01-01',
      phone: t.phone || '',
      email: t.email || '',
      address: t.address || '',
      qualification: t.qualification || '',
      subject_specialization: t.subject_specialization || '',
      assigned_class: t.assigned_class || 'Grade 10',
      joining_date: t.joining_date || '',
      basic_salary: Number(t.basic_salary) || 4500,
      profile_image:
        t.profile_image || '/src/assets/images/avatar_teacher_science_1790499596793.jpg',
      status: t.status || 'Active',
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

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTeacher) {
        const res = await apiRequest(`/api/teachers/${editingTeacher.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        showToast(res.message || 'Teacher updated successfully', 'success');
      } else {
        const res = await apiRequest('/api/teachers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        showToast(res.message || 'Teacher added successfully', 'success');
      }
      setModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      showToast(err.message || 'Unable to save teacher', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiRequest(`/api/teachers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      showToast(res.message || 'Teacher deleted successfully', 'success');
      setDeleteTarget(null);
      fetchTeachers();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete teacher', 'error');
    }
  };

  const openTeacherProfile = async (id: number) => {
    try {
      const res = await apiRequest(`/api/teachers/${id}`);
      setProfileDetail(res);
    } catch (err: any) {
      showToast(err.message || 'Unable to load teacher profile', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Faculty directory, academic qualifications, subject assignments, attendance, and payroll
            history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exportToCsv('pinkedu_faculty_directory', teachers);
              showToast('Faculty directory exported to CSV', 'success');
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-600" />
            <span>Export CSV</span>
          </button>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by teacher name, employee ID, subject, qualification..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-pink-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          {['', 'Active', 'On Leave', 'Inactive'].map((st) => (
            <button
              key={st || 'all'}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st || 'All Faculty'}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Teacher & Employee ID</th>
                <th className="py-3 px-4">Subject & Qualification</th>
                <th className="py-3 px-4">Assigned Class</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Basic Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </td>
                  </tr>
                ))
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No faculty records match your filter criteria.
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarImage src={t.profile_image} name={t.teacher_name} size="md" />
                        <div>
                          <button
                            onClick={() => openTeacherProfile(t.id)}
                            className="font-semibold text-slate-900 hover:text-pink-600 text-left cursor-pointer"
                          >
                            {t.teacher_name}
                          </button>
                          <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                            {t.employee_id} · Joined {t.joining_date}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{t.subject_specialization}</p>
                      <p className="text-slate-500 mt-0.5">{t.qualification}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{t.assigned_class}</td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-slate-800 tabular-nums">{t.phone}</p>
                      <p className="text-slate-500 mt-0.5">{t.email}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ${Number(t.basic_salary).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          t.status === 'Active'
                            ? 'text-emerald-700'
                            : t.status === 'On Leave'
                              ? 'text-amber-600'
                              : 'text-slate-500'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openTeacherProfile(t.id)}
                          className="p-1.5 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-md cursor-pointer"
                          title="View Teacher Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Edit Teacher"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(t)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                              title="Delete Teacher"
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
      </div>

      {/* Add / Edit Teacher Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTeacher ? 'Edit Faculty Member' : 'Add New Teacher'}
                </h2>
                <p className="text-xs text-slate-500">
                  Enter faculty academic credentials, specialization, and base payroll.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <AvatarImage
                  src={formData.profile_image}
                  name={formData.teacher_name || 'Teacher'}
                  size="lg"
                />
                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-md cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Faculty Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teacher Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Father&apos;s Name
                  </label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
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
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Specialization *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject_specialization}
                    onChange={(e) =>
                      setFormData({ ...formData, subject_specialization: e.target.value })
                    }
                    placeholder="e.g. Physics & Calculus"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Class
                  </label>
                  <select
                    value={formData.assigned_class}
                    onChange={(e) => setFormData({ ...formData, assigned_class: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 7">Grade 7</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Basic Salary ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.basic_salary}
                    onChange={(e) =>
                      setFormData({ ...formData, basic_salary: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
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
                  {saving ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Save Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Teacher Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Remove Faculty Record</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900">{deleteTarget.teacher_name}</span> (
              <span className="font-mono">{deleteTarget.employee_id}</span>)?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Profile Modal (Personal, Qualifications, Salary History, Attendance History) */}
      {profileDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 space-y-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <AvatarImage
                  src={profileDetail.teacher.profile_image}
                  name={profileDetail.teacher.teacher_name}
                  size="xl"
                />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {profileDetail.teacher.teacher_name}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {profileDetail.teacher.employee_id} · {profileDetail.teacher.qualification}
                  </p>
                  <p className="text-xs font-semibold text-pink-700 mt-1">
                    {profileDetail.teacher.subject_specialization} · Assigned:{' '}
                    {profileDetail.teacher.assigned_class}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">Personal & Contact</h3>
                <p className="text-slate-600">
                  Father&apos;s Name:{' '}
                  <span className="text-slate-900 font-medium">
                    {profileDetail.teacher.father_name}
                  </span>
                </p>
                <p className="text-slate-600">
                  Phone:{' '}
                  <span className="font-mono text-slate-900">{profileDetail.teacher.phone}</span>
                </p>
                <p className="text-slate-600">
                  Email: <span className="text-slate-900">{profileDetail.teacher.email}</span>
                </p>
                <p className="text-slate-600">
                  Address: <span className="text-slate-900">{profileDetail.teacher.address}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">Payroll & Attendance Summary</h3>
                <p className="text-slate-600">
                  Base Monthly Salary:{' '}
                  <span className="font-mono font-bold text-slate-900">
                    ${profileDetail.teacher.basic_salary}
                  </span>
                </p>
                <p className="text-slate-600">
                  Attendance Rate:{' '}
                  <span className="font-mono font-bold text-emerald-700">
                    {profileDetail.attendanceSummary.attendancePercentage}%
                  </span>
                </p>
                <p className="font-mono text-slate-500">
                  Present: {profileDetail.attendanceSummary.presentCount} · Late:{' '}
                  {profileDetail.attendanceSummary.lateCount} · Leave:{' '}
                  {profileDetail.attendanceSummary.leaveCount}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Salary History</h3>
                {profileDetail.salaryHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">No salary slips generated yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs font-mono tabular-nums">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans">
                        <tr>
                          <th className="py-2 px-3">Month</th>
                          <th className="py-2 px-3 text-right">Net</th>
                          <th className="py-2 px-3 text-right">Paid</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileDetail.salaryHistory.map((s: any) => (
                          <tr key={s.id}>
                            <td className="py-2 px-3">{s.salary_month}</td>
                            <td className="py-2 px-3 text-right">${s.net_salary}</td>
                            <td className="py-2 px-3 text-right text-emerald-700">
                              ${s.paid_amount}
                            </td>
                            <td className="py-2 px-3 text-right font-sans font-semibold">
                              {s.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Attendance Log</h3>
                {profileDetail.attendanceSummary.records.length === 0 ? (
                  <p className="text-xs text-slate-500">No attendance entries recorded.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs font-mono tabular-nums">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Check-In</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileDetail.attendanceSummary.records.map((a: any) => (
                          <tr key={a.id}>
                            <td className="py-2 px-3">{a.attendance_date}</td>
                            <td className="py-2 px-3">{a.check_in_time || '--:--'}</td>
                            <td className="py-2 px-3 text-right font-sans font-semibold">
                              {a.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
