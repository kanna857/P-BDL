import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { FiSliders, FiCheckCircle, FiAlertTriangle, FiShield, FiKey, FiLock } from 'react-icons/fi';

const AssignPermission = () => {
  const currentUser = useSelector(state => state.auth.user);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [checkedPermissions, setCheckedPermissions] = useState([]); // list of permission IDs

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/permissions')
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
      
      if (rolesRes.data.length > 0) {
        // Default to first role (e.g. Administrator or Manager)
        const firstRole = rolesRes.data[0];
        setSelectedRoleId(firstRole.id);
        setCheckedPermissions(firstRole.permissions?.map(p => p.id) || []);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch RBAC directory from API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleSelect = (roleId) => {
    setSelectedRoleId(roleId);
    const roleObj = roles.find(r => r.id === parseInt(roleId));
    if (roleObj) {
      setCheckedPermissions(roleObj.permissions?.map(p => p.id) || []);
    } else {
      setCheckedPermissions([]);
    }
  };

  const handlePermissionToggle = (permId) => {
    setCheckedPermissions(prev => {
      if (prev.includes(permId)) {
        return prev.filter(id => id !== permId);
      } else {
        return [...prev, permId];
      }
    });
  };

  const handleSavePermissions = async () => {
    setError('');
    setSuccess('');
    if (!selectedRoleId) return;
    
    // Core protection: prevent Administrator role modification to prevent lockout
    const activeRole = roles.find(r => r.id === parseInt(selectedRoleId));
    if (activeRole && activeRole.name === 'Administrator') {
      setError('Modification of Administrator role permissions is locked to protect directory stability.');
      return;
    }

    try {
      const response = await api.post('/roles/assign-permission', {
        role_id: parseInt(selectedRoleId),
        permission_ids: checkedPermissions
      });
      setSuccess(response.data.detail || 'Permissions updated successfully.');
      
      // Refresh local roles cache to update permissions mappings
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update privileges.');
    }
  };

  // Group permissions by their module field for readability
  const permissionsByModule = permissions.reduce((acc, curr) => {
    const mod = curr.module || 'Other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FiSliders className="text-microsoft-blue" />
          Role Privilege Matrix
        </h2>
        <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
          Map specific system action permissions to active security roles.
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-xs text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-microsoft-blue mr-2"></div>
          Reading RBAC privilege schemas...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Roles Selector (Left column) */}
          <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiShield className="text-microsoft-blue" />
              Directory Roles
            </h3>
            
            <div className="space-y-1">
              {roles.map(r => {
                const isAdmin = r.name === 'Administrator';
                return (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-xs font-semibold transition-all ${
                      selectedRoleId === r.id
                        ? 'bg-microsoft-blueLight text-microsoft-blue dark:bg-blue-950/40 dark:text-blue-400 border-l-4 border-microsoft-blue'
                        : 'text-gray-650 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      {r.name}
                      {isAdmin && <FiLock className="text-amber-500 flex-shrink-0" title="Administrator role is locked" />}
                    </span>
                    <span className="block text-[10px] text-gray-450 mt-0.5 font-normal truncate">{r.description || 'No description'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix (Right columns) */}
          <div className="md:col-span-2 bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-6">
            {/* Admin role lock banner */}
            {roles.find(r => r.id === parseInt(selectedRoleId))?.name === 'Administrator' && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                <FiLock className="flex-shrink-0" />
                <span><strong>Administrator role is locked.</strong> Its permissions cannot be modified to protect system stability.</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-3 border-b border-gray-150 dark:border-gray-850">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FiKey className="text-microsoft-blue" />
                Associated Privileges Checklist
              </h3>
              
              <button
                onClick={handleSavePermissions}
                disabled={roles.find(r => r.id === parseInt(selectedRoleId))?.name === 'Administrator'}
                className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                Save Privileges
              </button>
            </div>

            {/* Checklist items categorized by module */}
            <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                <div key={moduleName} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-microsoft-blue uppercase tracking-wider border-b border-gray-100 dark:border-gray-900 pb-1">{moduleName} Module</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {perms.map(p => (
                      <label 
                        key={p.id} 
                        className="flex items-start gap-3 p-2 bg-gray-50/50 dark:bg-slate-900/30 border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg text-xs cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checkedPermissions.includes(p.id)}
                          onChange={() => handlePermissionToggle(p.id)}
                          disabled={roles.find(r => r.id === parseInt(selectedRoleId))?.name === 'Administrator'}
                          className="mt-0.5 rounded border-gray-300 text-microsoft-blue focus:ring-microsoft-blue disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">{p.name}</p>
                          <p className="text-[10px] text-gray-400 leading-normal mt-0.5">{p.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default AssignPermission;
