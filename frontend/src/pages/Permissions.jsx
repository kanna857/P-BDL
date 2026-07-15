import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { FiPlus, FiTrash2, FiKey, FiCpu } from 'react-icons/fi';

const Permissions = () => {
  const { hasPermission } = useAuth();
  
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'delete'
  const [currentPerm, setCurrentPerm] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('users');
  const [formError, setFormError] = useState('');

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      let url = '/permissions';
      if (filterModule) url += `?module=${filterModule}`;
      const resp = await api.get(url);
      setPermissions(resp.data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [filterModule]);

  const openCreateModal = () => {
    setModalType('create');
    setName('');
    setDescription('');
    setModule('users');
    setFormError('');
    setModalOpen(true);
  };

  const openDeleteModal = (perm) => {
    setCurrentPerm(perm);
    setModalType('delete');
    setFormError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !module.trim()) {
      setFormError('Permission name and module are required.');
      return;
    }

    try {
      await api.post('/permissions', { name, description, module });
      setModalOpen(false);
      fetchPermissions();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'An error occurred during submission.');
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await api.delete(`/permissions/${currentPerm.id}`);
      setModalOpen(false);
      fetchPermissions();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to delete permission.');
    }
  };

  // Find unique modules to populate the filter select box
  // We can hardcode standard modules + any dynamic ones
  const systemModules = ['users', 'roles', 'permissions', 'departments', 'audit', 'login_history', 'custom'];

  const columns = [
    {
      key: 'name',
      label: 'Permission Key',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400">
            <FiKey />
          </div>
          <div>
            <p className="font-semibold font-mono text-gray-800 dark:text-gray-100">{row.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{row.description || 'No description'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'module',
      label: 'Service Module',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 uppercase tracking-wide">
          {row.module}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created Date',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        // Prevent deleting core seed permissions
        const isCorePerm = ['users:', 'roles:', 'permissions:', 'departments:', 'audit:', 'login_history:'].some(prefix => row.name.startsWith(prefix));
        return (
          <div className="flex items-center gap-2">
            {hasPermission('permissions:delete') && !isCorePerm && (
              <button
                onClick={() => openDeleteModal(row)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded transition-colors"
                title="Delete Permission"
              >
                <FiTrash2 className="text-sm" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const filterSelectors = (
    <select
      value={filterModule}
      onChange={(e) => setFilterModule(e.target.value)}
      className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
    >
      <option value="">All Modules</option>
      {systemModules.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Access Governance Privileges</h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
            System actions that roles bind to for granular capability enforcement.
          </p>
        </div>
        {hasPermission('permissions:write') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <FiPlus /> Register Privilege
          </button>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={permissions}
        filters={filterSelectors}
        loading={loading}
        emptyMessage="No privileges matches the module filter."
      />

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen && modalType === 'create'}
        onClose={() => setModalOpen(false)}
        title="Register Custom Access Privilege"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200 dark:border-red-950/50">
              {formError}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Permission Action Key</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200 font-mono"
              placeholder="e.g. reports:export"
              required
            />
            <p className="text-[10px] text-gray-400">Format using resource:action e.g. <code>billing:write</code></p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Module Group</label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              required
            >
              <option value="users">Users</option>
              <option value="roles">Roles</option>
              <option value="departments">Departments</option>
              <option value="audit">Audit / Logs</option>
              <option value="login_history">Login History</option>
              <option value="custom">Custom Extensions</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200 h-20 resize-none"
              placeholder="Context describing what capability this grants..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
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
              Register Privilege
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalOpen && modalType === 'delete'}
        onClose={() => setModalOpen(false)}
        title="Revoke System Privilege"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete the privilege <span className="font-bold font-mono text-gray-800 dark:text-white">"{currentPerm?.name}"</span>?
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/50 rounded-lg text-xs">
            <strong>Warning:</strong> Deleting this permission will remove it from all roles mapped to it. System configurations relying on this action will block access.
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
              Terminate Privilege
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Permissions;
