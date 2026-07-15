import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiFolder } from 'react-icons/fi';

const Departments = () => {
  const { hasPermission } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'delete'
  const [currentDept, setCurrentDept] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/departments');
      setDepartments(resp.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setModalType('create');
    setName('');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (dept) => {
    setCurrentDept(dept);
    setModalType('edit');
    setName(dept.name);
    setDescription(dept.description || '');
    setFormError('');
    setModalOpen(true);
  };

  const openDeleteModal = (dept) => {
    setCurrentDept(dept);
    setModalType('delete');
    setFormError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!name.trim()) {
      setFormError('Department name is required.');
      return;
    }

    try {
      if (modalType === 'create') {
        await api.post('/departments', { name, description });
      } else if (modalType === 'edit') {
        await api.put(`/departments/${currentDept.id}`, { name, description });
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'An error occurred during submission.');
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await api.delete(`/departments/${currentDept.id}`);
      setModalOpen(false);
      fetchDepartments();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to delete department.');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Department Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400">
            <FiFolder />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{row.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{row.description || 'No description'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'user_count',
      label: 'Allocated Users',
      render: (row) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
          {row.user_count} {row.user_count === 1 ? 'user' : 'users'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Registration Date',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {hasPermission('departments:write') && (
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 text-gray-400 hover:text-microsoft-blue hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Edit Department"
            >
              <FiEdit2 className="text-sm" />
            </button>
          )}
          {hasPermission('departments:delete') && (
            <button
              onClick={() => openDeleteModal(row)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded transition-colors"
              title="Delete Department"
            >
              <FiTrash2 className="text-sm" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Departments Directory</h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
            Configure the structural groups used for categorization and access scope filtering.
          </p>
        </div>
        {hasPermission('departments:write') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <FiPlus /> Add Department
          </button>
        )}
      </div>

      {/* Table Container */}
      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        emptyMessage="No departments configured in the current directory."
      />

      {/* Create & Edit Modal */}
      <Modal
        isOpen={modalOpen && (modalType === 'create' || modalType === 'edit')}
        onClose={() => setModalOpen(false)}
        title={modalType === 'create' ? 'Create New Department' : 'Edit Department Details'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200 dark:border-red-950/50">
              {formError}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Department Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200"
              placeholder="e.g. Finance Operations"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none focus:ring-1 focus:ring-microsoft-blue dark:text-gray-200 h-24 resize-none"
              placeholder="Brief summary of department functions..."
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
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalOpen && modalType === 'delete'}
        onClose={() => setModalOpen(false)}
        title="Confirm Department Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the department <span className="font-bold text-gray-800 dark:text-white">"{currentDept?.name}"</span>?
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-950/50 rounded-lg text-xs">
            <strong>Warning:</strong> Deleting this department will disassociate all currently allocated users. They will remain in the active directory with their department marked as "None".
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
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Departments;
