import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { FiUserPlus, FiSearch, FiCheckCircle, FiAlertTriangle, FiLock } from 'react-icons/fi';

const AssignRole = () => {
  const currentUser = useSelector(state => state.auth.user);
  const isCurrentUserAdmin = currentUser?.role?.name === 'Administrator';
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRoles, setSelectedRoles] = useState({}); // user_id -> role_id mapping

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      
      // Initialize dropdown selections
      const initialRoles = {};
      usersRes.data.forEach(u => {
        initialRoles[u.id] = u.role?.id || '';
      });
      setSelectedRoles(initialRoles);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch directory database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = (userId, roleId) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: roleId }));
  };

  const handleAssignRole = async (userId) => {
    setError('');
    setSuccess('');
    const roleId = selectedRoles[userId];
    try {
      const response = await api.post('/users/assign-role', {
        user_id: userId,
        role_id: roleId ? parseInt(roleId) : null
      });
      setSuccess(response.data.detail || 'Role assignment updated successfully.');
      
      // Refresh database to reflect name updates in table
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign role.');
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.first_name?.toLowerCase().includes(term) ||
      u.last_name?.toLowerCase().includes(term) ||
      u.role?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FiUserPlus className="text-microsoft-blue" />
          Assign User Roles
        </h2>
        <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
          Modify active identity roles to adjust access permissions across the enterprise tenant.
        </p>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl flex items-center gap-2 text-xs">
          <FiCheckCircle className="text-lg flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs">
          <FiAlertTriangle className="text-lg flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex glass-card p-4 rounded-xl border border-slate-800/40 shadow-sm">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800/50 bg-slate-950/40 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-xs text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-550 mr-2"></div>
          Reading identities directory...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 glass-card border border-slate-800/40 rounded-xl shadow-sm">
          <p className="text-gray-400 text-xs">No matching users found in tenant directory.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-slate-800/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/20 text-gray-400 border-b border-slate-800/40 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User Identity</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Current Role</th>
                  <th className="px-6 py-3.5">Modify Assignment</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/35 text-gray-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-200">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-[10px] text-gray-450 font-medium">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-350">
                      {u.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-400">
                      {u.role?.name || 'Visitor (Default)'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={selectedRoles[u.id] || ''}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1.5 text-xs rounded-lg border border-slate-800/50 bg-slate-950/50 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                      >
                        <option value="" className="bg-slate-950 text-gray-200">Visitor (No permissions)</option>
                        {roles
                          .filter(r => isCurrentUserAdmin || r.name !== 'Administrator')
                          .map(r => (
                            <option key={r.id} value={r.id} className="bg-slate-950 text-gray-200">{r.name}</option>
                          ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role?.name === 'Administrator' && !isCurrentUserAdmin ? (
                        <span className="flex items-center justify-end gap-1 text-amber-500 text-[11px] font-semibold">
                          <FiLock />
                          Admin locked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAssignRole(u.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-colors"
                        >
                          Save Assignment
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
    </div>
  );
};

export default AssignRole;
