import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { FiClock, FiShield, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const LoginHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 25;

  const fetchLoginHistory = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * limit;
      let url = `/audit/login-history?skip=${skip}&limit=${limit}`;
      if (searchValue) url += `&search=${encodeURIComponent(searchValue)}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      
      const resp = await api.get(url);
      setHistory(resp.data);
      setTotalPages(Math.ceil(resp.data.length / limit) || 1);
    } catch (err) {
      console.error('Error fetching login history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoginHistory();
  }, [currentPage, searchValue, filterStatus]);

  const columns = [
    {
      key: 'timestamp',
      label: 'Sign-in Time',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FiClock className="text-gray-400" />
          <span>{new Date(row.timestamp).toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Sign-in Identity',
      render: (row) => <span className="font-semibold text-gray-800 dark:text-gray-200">{row.email}</span>
    },
    {
      key: 'status',
      label: 'Auth Status',
      render: (row) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
          row.status === 'Success'
            ? 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400'
            : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
        }`}>
          {row.status === 'Success' ? <FiCheckCircle /> : <FiAlertTriangle />}
          {row.status}
        </span>
      )
    },
    {
      key: 'failure_reason',
      label: 'Failure Context',
      render: (row) => row.failure_reason || <span className="text-gray-400 italic">None</span>
    },
    {
      key: 'ip_address',
      label: 'Client IP',
      render: (row) => row.ip_address || 'Internal'
    },
    {
      key: 'user_agent',
      label: 'Client Device/Browser (User Agent)',
      render: (row) => (
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs block" title={row.user_agent}>
          {row.user_agent || 'Unknown'}
        </span>
      )
    }
  ];

  const filterSelectors = (
    <select
      value={filterStatus}
      onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
      className="px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
    >
      <option value="">All Attempts</option>
      <option value="Success">Success Sign-ins</option>
      <option value="Failed">Failed Sign-ins</option>
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sign-in Audit Trails</h2>
        <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
          History log tracker monitoring directory credentials attempts, failures, and device headers.
        </p>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={history}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search email, client IP..."
        filters={filterSelectors}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage
        }}
        loading={loading}
        emptyMessage="No login histories found matching filters."
      />
    </div>
  );
};

export default LoginHistory;
