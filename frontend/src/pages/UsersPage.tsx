import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RoleBadge, ActiveBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { PageSpinner, EmptyState } from '../components/Shared';
import { ConfirmModal } from '../components/ConfirmModal';
import { Users, UserPlus, Shield, CheckCircle, Ban, RefreshCw, X } from 'lucide-react';
import { formatDate } from '../utils';
import type { User } from '../types';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client' as 'client' | 'operator' | 'admin',
    organisation: '',
  });

  // Toggle user state modal
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<User[]>('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
      addToast('Failed to load users list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        organisation: formData.organisation || null,
      });
      addToast(`User ${formData.name} created successfully`, 'success');
      setModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'client',
        organisation: '',
      });
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create user';
      addToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmTarget) return;
    try {
      await api.patch(`/api/users/${confirmTarget.id}`, {
        is_active: !confirmTarget.is_active,
      });
      addToast(
        `User ${confirmTarget.name} ${confirmTarget.is_active ? 'deactivated' : 'activated'}`,
        'success'
      );
      setConfirmTarget(null);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update user status';
      addToast(msg, 'error');
    }
  };

  const handleChangeRole = async (targetUser: User, newRole: string) => {
    if (targetUser.id === currentUser?.id) {
      addToast('Cannot modify your own administrative role', 'error');
      return;
    }
    try {
      await api.patch(`/api/users/${targetUser.id}`, {
        role: newRole,
      });
      addToast(`Updated role for ${targetUser.name} to ${newRole}`, 'success');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update user role';
      addToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Administration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage user accounts, assign role permissions, and control access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={fetchUsers} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <PageSpinner />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No users found"
            description="Create the first user account to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Organisation</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {isSelf ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u, e.target.value)}
                            className="text-xs font-semibold uppercase tracking-wider rounded border border-gray-300 py-1 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="client">Client</option>
                            <option value="operator">Operator</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {u.organisation || <span className="text-gray-400 italic">None</span>}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <ActiveBadge active={u.is_active} />
                      </td>

                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {!isSelf && (
                          <button
                            onClick={() => setConfirmTarget(u)}
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                              u.is_active
                                ? 'text-red-700 bg-red-50 hover:bg-red-100'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Create New Account</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Marie Curie"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@domain.com"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as any })
                    }
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="client">Client</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Organisation (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.organisation}
                    onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                    placeholder="e.g. Acme Robotics"
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmTarget && (
        <ConfirmModal
          open={true}
          title={confirmTarget.is_active ? 'Deactivate User Account' : 'Reactivate User Account'}
          message={`Are you sure you want to ${
            confirmTarget.is_active ? 'deactivate' : 'activate'
          } ${confirmTarget.name} (${confirmTarget.email})? ${
            confirmTarget.is_active
              ? 'They will immediately be blocked from authenticating to the platform.'
              : 'They will be allowed to log in and access the system.'
          }`}
          confirmLabel={confirmTarget.is_active ? 'Deactivate' : 'Activate'}
          confirmVariant={confirmTarget.is_active ? 'danger' : 'primary'}
          onConfirm={handleToggleActive}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
