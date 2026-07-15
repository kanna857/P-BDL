import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiSearch, FiUserCheck, FiUserX } from 'react-icons/fi';

const Users = () => {
  const { hasPermission } = useAuth();
  
  // Table state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Filter selections
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dropdown lists
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'delete'
  const [currentUser, setCurrentUser] = useState(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [deptId, setDeptId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * limit;
      let url = `/users?skip=${skip}&limit=${limit}`;
      if (searchValue) url += `&search=${encodeURIComponent(searchValue)}`;
      if (filterDept) url += `&department_id=${filterDept}`;
      if (filterRole) url += `&role_id=${filterRole}`;
      if (filterStatus) url += `&is_active=${filterStatus === 'active'}`;
      
      const resp = await api.get(url);
      setUsers(resp.data);
      // Mock total pages for demonstration, as we retrieve all filtered users in this simple design. 
      // In production, we'd have a count header, let's calculate total pages from list length.
      setTotalPages(Math.ceil(resp.data.length / limit) || 1);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const [deptResp, roleResp] = await Promise.all([
        api.get('/departments'),
        api.get('/roles')
      ]);
      setDepartments(deptResp.data);
      setRoles(roleResp.data);
    } catch (err) {
      console.error('Error fetching filters list:', err);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchValue, filterDept, filterRole, filterStatus]);

  const openCreateModal = () => {
    setModalType('create');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setDeptId('');
    setRoleId('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setModalType('edit');
    setEmail(user.email);
    setPassword(''); // Empty to keep password unchanged
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setDeptId(user.department_id || '');
    setRoleId(user.role_id || '');
    setIsActive(user.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setCurrentUser(user);
    setModalType('delete');
    setFormError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email) {
      setFormError('Email is required.');
      return;
    }
    if (modalType === 'create' && !password) {
      setFormError('Password is required for new users.');
      return;
    }

    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      department_id: deptId ? parseInt(deptId) : 0, // 0 handles NULL in backend
      role_id: roleId ? parseInt(roleId) : 0,
      is_active: isActive
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (modalType === 'create') {
        await api.post('/users', payload);
      } else {
        await api.put(`/users/${currentUser.id}`, payload);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'An error occurred during submission.');
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await api.delete(`/users/${currentUser.id}`);
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Directory User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-microsoft-blueLight text-microsoft-blue font-semibold text-xs">
            {row.first_name ? row.first_name[0] : 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.department?.name || <span className="text-gray-400 italic">None</span>
    },
    {
      key: 'role',
      label: 'Security Role',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          row.role?.name === 'Administrator' 
            ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
            : row.role?.name === 'Security Officer'
            ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400'
            : row.role?.name === 'Manager'
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'
        }`}>
          {row.role?.name || 'Visitor'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Account Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${row.is_active ? 'bg-green-500 status-active-dot' : 'bg-gray-400'}`}></span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {row.is_active ? 'Active' : 'Deactivated'}
          </span>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Creation Date',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {hasPermission('users:write') && (
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 text-gray-400 hover:text-microsoft-blue hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Update User Profile"
            >
              <FiEdit2 className="text-sm" />
            </button>
          )}
          {hasPermission('users:delete') && (
            <button
              onClick={() => openDeleteModal(row)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded transition-colors"
              title="Delete Account"
            >
              <FiTrash2 className="text-sm" />
            </button>
          )}
        </div>
      )
    }
  ];

  const filterSelectors = (
    <>
      <select
        value={filterDept}
        onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
        className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
      >
        <option value="">All Departments</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select
        value={filterRole}
        onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
        className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
      >
        <option value="">All Roles</option>
        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <select
        value={filterStatus}
        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
      >
        <option value="">All Statuses</option>
        <option value="active">Active Accounts</option>
        <option value="inactive">Inactive Accounts</option>
      </select>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Users Directory</h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
            Manage enterprise logins, assign organizational divisions, and configure access roles.
          </p>
        </div>
        {hasPermission('users:write') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <FiPlus /> Create User
          </button>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={users}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search by name, email..."
        filters={filterSelectors}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage
        }}
        loading={loading}
        emptyMessage="No directory accounts matched the query."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen && (modalType === 'create' || modalType === 'edit')}
        onClose={() => setModalOpen(false)}
        title={modalType === 'create' ? 'Create New User' : 'Update User Profile'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200 dark:border-red-950/50">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
                placeholder="John"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              placeholder="name@entra-rbac.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {modalType === 'create' ? 'Credentials Password' : 'Change Password (leave empty to keep current)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              placeholder="••••••••"
              required={modalType === 'create'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Department</label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              >
                <option value="">None / Floating</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Governance Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              >
                <option value="">None / Visitor</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {modalType === 'edit' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActiveCheck"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-microsoft-blue rounded border-gray-300 focus:ring-microsoft-blue"
              />
              <label htmlFor="isActiveCheck" className="text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                Account Active (if unchecked, user cannot sign in)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-microsoft-borderLight dark:border-microsoft-borderDark">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-microsoft-borderDark text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Save Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalOpen && modalType === 'delete'}
        onClose={() => setModalOpen(false)}
        title="Revoke Directory Access"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete the account for <span className="font-bold text-gray-800 dark:text-white">{currentUser?.first_name} {currentUser?.last_name}</span> ({currentUser?.email})?
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/50 rounded-lg text-xs">
            <strong>Warning:</strong> This will terminate their directory session, delete all refresh logs, and permanently remove the user account from the server.
          </div>
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200 dark:border-red-950/50">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-microsoft-borderDark text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSubmit}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Terminate User
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
