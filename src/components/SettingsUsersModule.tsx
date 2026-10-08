import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth, UserRole } from '../context/AuthContext';
import { AvatarImage } from './ui/AvatarImage';
import { Plus, Trash2, Shield, KeyRound, User, X } from 'lucide-react';

export const SettingsUsersModule: React.FC = () => {
  const { user, refreshUser, showToast } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [usersList, setUsersList] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Add User Modal (Admin only)
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Teacher' as UserRole,
    phone: '',
  });

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiRequest('/api/users');
      setUsersList(res.users || []);
    } catch {
      // Ignore
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      });
    }
    fetchUsers();
  }, [user, fetchUsers]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      showToast(res.message || 'Profile updated successfully', 'success');
      refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Unable to update profile', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast('New password and confirmation do not match', 'error');
      return;
    }
    try {
      const res = await apiRequest('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword,
        }),
      });
      showToast(res.message || 'Password changed successfully', 'success');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err.message || 'Unable to change password', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm),
      });
      showToast(res.message || 'User account created successfully', 'success');
      setUserModalOpen(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'Teacher', phone: '' });
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Unable to create user', 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
      showToast(res.message || 'User deleted successfully', 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete user', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Profile, Security & User Access Control
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Update your personal profile, change your account password, and manage role-based system
          users.
        </p>
      </div>

      {/* Profile & Change Password Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-pink-600" />
            <h2 className="text-sm font-bold text-slate-900">Update Account Profile</h2>
          </div>

          <div className="flex items-center gap-3">
            <AvatarImage src={user?.avatar_url} name={user?.name || 'User'} size="lg" />
            <div className="text-xs">
              <p className="font-bold text-slate-900">{user?.name}</p>
              <p className="text-slate-500">
                Role: <span className="font-semibold text-pink-700">{user?.role}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-pink-600" />
            <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={passForm.currentPassword}
                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Password (min 6 chars) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Admin Only: Role-Based User Management Table */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-pink-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">System Users & Roles</h3>
                <p className="text-xs text-slate-500">
                  Manage Admin, Accountant, and Teacher portal accounts
                </p>
              </div>
            </div>
            <button
              onClick={() => setUserModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 font-semibold text-pink-700">{u.role}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.phone || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{u.status}</td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create Portal User</h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
