import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarImage } from './ui/AvatarImage';
import { Plus, Edit2, Trash2, Users, X, Search } from 'lucide-react';

interface AcademicModuleProps {
  mode: 'classes' | 'subjects';
}

export const AcademicModule: React.FC<AcademicModuleProps> = ({ mode }) => {
  const { user, showToast } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Class Modal State
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [classForm, setClassForm] = useState({
    class_name: 'Grade 10',
    section: 'A',
    class_teacher_id: '',
    room_number: 'RM-305',
    capacity: 35,
    status: 'Active',
  });

  // View Students in Class Modal
  const [viewingClassStudents, setViewingClassStudents] = useState<any | null>(null);

  // Subject Modal State
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    subject_name: '',
    subject_code: '',
    class_name: 'Grade 10',
    teacher_id: '',
    description: '',
    status: 'Active',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clsRes, subRes, tchRes] = await Promise.all([
        apiRequest('/api/classes', { params: { search: mode === 'classes' ? search : '' } }),
        apiRequest('/api/subjects', { params: { search: mode === 'subjects' ? search : '' } }),
        apiRequest('/api/teachers'),
      ]);
      setClasses(clsRes.classes || []);
      setSubjects(subRes.subjects || []);
      setTeachers(tchRes.teachers || []);
    } catch (err: any) {
      showToast(err.message || 'Unable to load academic records', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, search, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Class Handlers
  const openCreateClass = () => {
    setEditingClass(null);
    setClassForm({
      class_name: 'Grade 8',
      section: 'B',
      class_teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      room_number: 'RM-109',
      capacity: 32,
      status: 'Active',
    });
    setClassModalOpen(true);
  };

  const openEditClass = (cls: any) => {
    setEditingClass(cls);
    setClassForm({
      class_name: cls.class_name,
      section: cls.section,
      class_teacher_id: cls.class_teacher_id ? String(cls.class_teacher_id) : '',
      room_number: cls.room_number,
      capacity: cls.capacity,
      status: cls.status,
    });
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        const res = await apiRequest(`/api/classes/${editingClass.id}`, {
          method: 'PUT',
          body: JSON.stringify(classForm),
        });
        showToast(res.message || 'Class updated successfully', 'success');
      } else {
        const res = await apiRequest('/api/classes', {
          method: 'POST',
          body: JSON.stringify(classForm),
        });
        showToast(res.message || 'Class added successfully', 'success');
      }
      setClassModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Unable to save class', 'error');
    }
  };

  const handleDeleteClass = async (id: number) => {
    try {
      const res = await apiRequest(`/api/classes/${id}`, { method: 'DELETE' });
      showToast(res.message || 'Class deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete class', 'error');
    }
  };

  // Subject Handlers
  const openCreateSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      subject_name: '',
      subject_code: `SUB-${100 + subjects.length + 1}`,
      class_name: 'Grade 10',
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      description: '',
      status: 'Active',
    });
    setSubjectModalOpen(true);
  };

  const openEditSubject = (sub: any) => {
    setEditingSubject(sub);
    setSubjectForm({
      subject_name: sub.subject_name,
      subject_code: sub.subject_code,
      class_name: sub.class_name,
      teacher_id: sub.teacher_id ? String(sub.teacher_id) : '',
      description: sub.description || '',
      status: sub.status,
    });
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        const res = await apiRequest(`/api/subjects/${editingSubject.id}`, {
          method: 'PUT',
          body: JSON.stringify(subjectForm),
        });
        showToast(res.message || 'Subject updated successfully', 'success');
      } else {
        const res = await apiRequest('/api/subjects', {
          method: 'POST',
          body: JSON.stringify(subjectForm),
        });
        showToast(res.message || 'Subject added successfully', 'success');
      }
      setSubjectModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Unable to save subject', 'error');
    }
  };

  const handleDeleteSubject = async (id: number) => {
    try {
      const res = await apiRequest(`/api/subjects/${id}`, { method: 'DELETE' });
      showToast(res.message || 'Subject deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete subject', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'classes' ? 'Class & Section Management' : 'Subject & Curriculum Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'classes'
              ? 'Manage grade sections, room capacities, homeroom faculty, and enrolled class rosters.'
              : 'Configure curriculum subjects, course codes, grade mappings, and assigned faculty.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${mode}...`}
              className="pl-9 pr-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-pink-600"
            />
          </div>
          {isAdmin && (
            <button
              onClick={mode === 'classes' ? openCreateClass : openCreateSubject}
              className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{mode === 'classes' ? 'Add Class' : 'Add Subject'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {mode === 'classes' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Class Teacher</th>
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4 text-right">Enrolled / Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading classes...
                    </td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No classes found.
                    </td>
                  </tr>
                ) : (
                  classes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          {c.class_name} — Section {c.section}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {c.class_teacher_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                        {c.room_number}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className="font-semibold text-slate-900">{c.student_count}</span>
                        <span className="text-slate-400"> / {c.capacity}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            c.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingClassStudents(c)}
                            className="px-2.5 py-1 text-xs font-medium text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-md flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Students ({c.student_count})</span>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEditClass(c)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(c.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
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
      ) : (
        /* Subjects Table */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">Subject Name & Code</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Assigned Teacher</th>
                  <th className="py-3 px-4">Curriculum Description</th>
                  <th className="py-3 px-4">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading subjects...
                    </td>
                  </tr>
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No subjects found.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{sub.subject_name}</p>
                        <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                          {sub.subject_code}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{sub.class_name}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{sub.teacher_name}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-sm truncate">
                        {sub.description || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            sub.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditSubject(sub)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(sub.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Class Add/Edit Modal */}
      {classModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? 'Edit Class Section' : 'Create New Class'}
              </h3>
              <button onClick={() => setClassModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class Name *</label>
                  <input
                    type="text"
                    required
                    value={classForm.class_name}
                    onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
                    placeholder="Grade 10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section *</label>
                  <input
                    type="text"
                    required
                    value={classForm.section}
                    onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                    placeholder="A"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Class Teacher</label>
                <select
                  value={classForm.class_teacher_id}
                  onChange={(e) =>
                    setClassForm({ ...classForm, class_teacher_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacher_name} ({t.subject_specialization})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={classForm.room_number}
                    onChange={(e) => setClassForm({ ...classForm, room_number: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity *</label>
                  <input
                    type="number"
                    required
                    value={classForm.capacity}
                    onChange={(e) =>
                      setClassForm({ ...classForm, capacity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Students in Class Modal */}
      {viewingClassStudents && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewingClassStudents.class_name} — Section {viewingClassStudents.section} Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Class Teacher: {viewingClassStudents.class_teacher_name} · Room:{' '}
                  {viewingClassStudents.room_number}
                </p>
              </div>
              <button
                onClick={() => setViewingClassStudents(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingClassStudents.students?.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No students currently enrolled in this section.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Guardian</th>
                      <th className="py-2.5 px-3 text-right">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingClassStudents.students.map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <AvatarImage src={s.profile_image} name={s.student_name} size="sm" />
                            <div>
                              <p className="font-semibold text-slate-900">{s.student_name}</p>
                              <p className="font-mono text-slate-500">{s.student_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{s.roll_number}</td>
                        <td className="py-2.5 px-3 text-slate-700">{s.father_name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {s.phone}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subject Add/Edit Modal */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button onClick={() => setSubjectModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.subject_name}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, subject_name: e.target.value })
                  }
                  placeholder="e.g. Molecular Biology"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.subject_code}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, subject_code: e.target.value })
                    }
                    placeholder="BIO-101"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class *</label>
                  <select
                    value={subjectForm.class_name}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, class_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 7">Grade 7</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Teacher</label>
                <select
                  value={subjectForm.teacher_id}
                  onChange={(e) => setSubjectForm({ ...subjectForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacher_name} ({t.subject_specialization})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={subjectForm.description}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
