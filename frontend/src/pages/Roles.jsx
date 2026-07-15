import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiShield, FiKey } from 'react-icons/fi';

const Roles = () => {
  const { hasPermission } = useAuth();
  
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'delete'
  const [currentRole, setCurrentRole] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [formError, setFormError] = useState('');

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const [rolesResp, permsResp] = await Promise.all([
        api.get('/roles'),
        api.get('/permissions')
      ]);
      setRoles(rolesResp.data);
      setPermissions(permsResp.data);
    } catch (err) {
      console.error('Error loading roles data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const openCreateModal = () => {
    setModalType('create');
    setName('');
    setDescription('');
    setSelectedPermIds([]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setCurrentRole(role);
    setModalType('edit');
    setName(role.name);
    setDescription(role.description || '');
    setSelectedPermIds(role.permissions.map(p => p.id));
    setFormError('');
    setModalOpen(true);
  };

  const openDeleteModal = (role) => {
    setCurrentRole(role);
    setModalType('delete');
    setFormError('');
    setModalOpen(true);
  };

  const handleCheckboxChange = (permId) => {
    if (selectedPermIds.includes(permId)) {
      setSelectedPermIds(selectedPermIds.filter(id => id !== permId));
    } else {
      setSelectedPermIds([...selectedPermIds, permId]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Role name is required.');
      return;
    }

    const payload = {
      name,
      description,
      permission_ids: selectedPermIds
    };

    try {
      if (modalType === 'create') {
        await api.post('/roles', payload);
      } else {
        await api.put(`/roles/${currentRole.id}`, payload);
      }
      setModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'An error occurred during submission.');
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await api.delete(`/roles/${currentRole.id}`);
      setModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to delete role.');
    }
  };

  // Group permissions by their module for rendering checkboxes
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const columns = [
    {
      key: 'name',
      label: 'Security Role',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-teal-50 text-teal-500 dark:bg-teal-950/20 dark:text-teal-400">
            <FiShield />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{row.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{row.description || 'No description'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'permissions_count',
      label: 'Privilege Bindings',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FiKey className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {row.name === 'Administrator' ? 'Global Access (*)' : `${row.permissions?.length || 0} permissions`}
          </span>
        </div>
      )
    },
    {
      key: 'permissions',
      label: 'Granted Actions (Preview)',
      render: (row) => {
        if (row.name === 'Administrator') {
          return <span className="text-xs text-red-500 font-mono">Bypasses checks (Superuser)</span>;
        }
        if (!row.permissions || row.permissions.length === 0) {
          return <span className="text-xs text-gray-400 italic">No permissions</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {row.permissions.slice(0, 3).map((p) => (
              <span key={p.id} className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-[10px] text-gray-600 dark:text-gray-400 font-mono rounded">
                {p.name}
              </span>
            ))}
            {row.permissions.length > 3 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 self-center">
                +{row.permissions.length - 3} more
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        // Prevent deleting core admin and visitor roles
        const isCoreRole = ['Administrator', 'Visitor'].includes(row.name);
        return (
          <div className="flex items-center gap-2">
            {hasPermission('roles:write') && (
              <button
                onClick={() => openEditModal(row)}
                className="p-1.5 text-gray-400 hover:text-microsoft-blue hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Edit Role & Mappings"
              >
                <FiEdit2 className="text-sm" />
              </button>
            )}
            {hasPermission('roles:delete') && !isCoreRole && (
              <button
                onClick={() => openDeleteModal(row)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded transition-colors"
                title="Delete Role"
              >
                <FiTrash2 className="text-sm" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Enterprise Role Definitions</h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
            Configure permission policies and bind actions to security role names.
          </p>
        </div>
        {hasPermission('roles:write') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <FiPlus /> Define Custom Role
          </button>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={roles}
        loading={loading}
        emptyMessage="No roles configured in the governance directory."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen && (modalType === 'create' || modalType === 'edit')}
        onClose={() => setModalOpen(false)}
        title={modalType === 'create' ? 'Define Custom Security Role' : 'Edit Role Configurations'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200 dark:border-red-950/50">
              {formError}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Role Identity Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              placeholder="e.g. Lead Developer"
              disabled={currentRole && ['Administrator', 'Visitor'].includes(currentRole.name)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200 h-16 resize-none"
              placeholder="Granted responsibilities..."
            />
          </div>

          {/* Permissions Matrix */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block border-b border-microsoft-borderLight dark:border-microsoft-borderDark pb-1">
              Associate Privilege Permissions
            </label>
            
            {name === 'Administrator' ? (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/50 rounded-lg text-xs">
                Administrators automatically bypass standard checking filters and holds all privileges. Explicit mappings are omitted.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {Object.keys(groupedPermissions).map((module) => (
                  <div key={module} className="space-y-1.5">
                    <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {module} Management
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                      {groupedPermissions[module].map((perm) => (
                        <label 
                          key={perm.id} 
                          className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-900/50 select-none text-xs text-gray-700 dark:text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermIds.includes(perm.id)}
                            onChange={() => handleCheckboxChange(perm.id)}
                            className="w-4 h-4 text-microsoft-blue border-gray-300 rounded focus:ring-microsoft-blue"
                          />
                          <div>
                            <p className="font-medium font-mono">{perm.name}</p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{perm.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              Save Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalOpen && modalType === 'delete'}
        onClose={() => setModalOpen(false)}
        title="Revoke Role Definition"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete the role <span className="font-bold text-gray-800 dark:text-white">"{currentRole?.name}"</span>?
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/50 rounded-lg text-xs">
            <strong>Warning:</strong> Deleting this role will disassociate all users who hold this role. Their authorization will fall back to "Visitor" defaults.
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
              Terminate Role
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Roles;
