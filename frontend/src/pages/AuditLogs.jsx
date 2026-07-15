import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { FiList, FiClock, FiUser, FiInfo } from 'react-icons/fi';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 25;

  // Selected log for drawer/modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * limit;
      let url = `/audit/logs?skip=${skip}&limit=${limit}`;
      if (searchValue) url += `&search=${encodeURIComponent(searchValue)}`;
      if (filterAction) url += `&action=${filterAction}`;
      if (filterResource) url += `&resource_type=${filterResource}`;
      
      const resp = await api.get(url);
      setLogs(resp.data);
      // Simple pagination total page math
      setTotalPages(Math.ceil(resp.data.length / limit) || 1);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, searchValue, filterAction, filterResource]);

  const viewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  // Define column layout
  const columns = [
    {
      key: 'timestamp',
      label: 'Event Time',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FiClock className="text-gray-400" />
          <span>{new Date(row.timestamp).toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'actor',
      label: 'Actor (User)',
      render: (row) => (
        <div className="flex items-center gap-1">
          <FiUser className="text-gray-400" />
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {row.user?.email || 'System / Initial Seed'}
          </span>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Operation Activity',
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 font-mono text-xs">
          {row.action}
        </span>
      )
    },
    {
      key: 'resource_type',
      label: 'Resource Target',
      render: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {row.resource_type} (ID: {row.resource_id || 'N/A'})
        </span>
      )
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      render: (row) => row.ip_address || <span className="text-gray-400 italic">Internal</span>
    },
    {
      key: 'actions',
      label: 'Inspection',
      render: (row) => (
        <button
          onClick={() => viewDetails(row)}
          className="flex items-center gap-1.5 text-xs text-microsoft-blue hover:text-microsoft-blueHover hover:underline font-semibold"
        >
          <FiInfo /> Details
        </button>
      )
    }
  ];

  // System options for filters
  const actionOptions = [
    'USER_LOGIN', 'USER_LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
    'ASSIGN_ROLE', 'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
    'CREATE_PERMISSION', 'DELETE_PERMISSION', 'ASSIGN_PERMISSIONS',
    'CREATE_DEPARTMENT', 'UPDATE_DEPARTMENT', 'DELETE_DEPARTMENT'
  ];

  const resourceOptions = ['User', 'Role', 'Permission', 'Department'];

  const filterSelectors = (
    <>
      <select
        value={filterAction}
        onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
        className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
      >
        <option value="">All Operations</option>
        {actionOptions.map(act => <option key={act} value={act}>{act}</option>)}
      </select>

      <select
        value={filterResource}
        onChange={(e) => { setFilterResource(e.target.value); setCurrentPage(1); }}
        className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
      >
        <option value="">All Resources</option>
        {resourceOptions.map(res => <option key={res} value={res}>{res}</option>)}
      </select>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Compliance Audit Trail</h2>
        <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
          Read-only history logs of security governance and administrative operations.
        </p>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={logs}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search actor, ip, action..."
        filters={filterSelectors}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage
        }}
        loading={loading}
        emptyMessage="No audit logs matched search filters."
      />

      {/* Details Inspector Modal */}
      <Modal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Audit Log Event Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-gray-400">Timestamp</p>
                <p className="text-gray-800 dark:text-gray-200 mt-0.5">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-400">User Client IP</p>
                <p className="text-gray-800 dark:text-gray-200 mt-0.5">
                  {selectedLog.ip_address || 'System Internal'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-400">Operation Action</p>
                <p className="text-gray-800 dark:text-gray-200 mt-0.5 font-mono">
                  {selectedLog.action}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-400">Resource Target</p>
                <p className="text-gray-800 dark:text-gray-200 mt-0.5">
                  {selectedLog.resource_type} (ID: {selectedLog.resource_id || 'N/A'})
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400">Operation Data / Payload Details</p>
              <pre className="p-4 bg-gray-50 dark:bg-slate-900 border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs;
