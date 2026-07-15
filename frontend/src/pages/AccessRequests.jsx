import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  FiCheckCircle, FiXCircle, FiClock, FiSearch, 
  FiAlertTriangle, FiSliders, FiActivity, FiArrowRight 
} from 'react-icons/fi';

const AccessRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Review Modal state
  const [selectedReq, setSelectedReq] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState('Approved'); // 'Approved' or 'Rejected'
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await api.get('/access-requests', { params });
      setRequests(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch access requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setReviewLoading(true);
    try {
      const response = await api.put(`/access-requests/${selectedReq.id}/approve`, {
        status: reviewAction,
        notes: reviewNotes
      });
      // Update local state
      setRequests(prev => prev.map(r => r.id === selectedReq.id ? response.data : r));
      setSelectedReq(null);
      setReviewNotes('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = (req, action) => {
    setSelectedReq(req);
    setReviewAction(action);
    setReviewNotes('');
  };

  const filteredRequests = requests.filter(r => {
    const term = search.toLowerCase();
    return (
      r.requester_name?.toLowerCase().includes(term) ||
      r.requester_email?.toLowerCase().includes(term) ||
      r.resource_name?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300"><FiCheckCircle /> Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"><FiXCircle /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><FiClock className="animate-spin" /> Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Access Request Reviews</h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
            Manage incoming resource swipes, physical keys, and AI-assisted governance pipelines.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-microsoft-cardDark p-4 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search by requester, resource, reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Status:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
          >
            <option value="">All Requests</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs">
          <FiAlertTriangle className="text-lg flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-xs text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-microsoft-blue mr-2"></div>
          Retrieving governance clearance requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-microsoft-cardDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-xl shadow-sm">
          <p className="text-gray-400 text-xs">No matching requests found in directories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => (
            <div 
              key={req.id} 
              className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-all p-6 space-y-4"
            >
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-microsoft-blueLight text-microsoft-blue font-bold flex items-center justify-center text-sm shadow-inner">
                    {req.requester_name ? req.requester_name[0] : 'U'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">{req.requester_name}</h4>
                    <p className="text-[10px] text-microsoft-subtextLight dark:text-microsoft-subtextDark font-medium">
                      {req.requester_email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-400">Request ID: #{req.id}</span>
                  {getStatusBadge(req.status)}
                </div>
              </div>

              {/* Middle contents */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Resource Info */}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Target Resource</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {req.room_name || req.resource_name}
                    <span className="px-2 py-0.5 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded">
                      {req.duration_days} Days
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">Requested: {new Date(req.created_at).toLocaleDateString()}</p>
                </div>

                {/* Justification */}
                <div className="space-y-1 md:col-span-1">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Employee Business Reason</p>
                  <p className="text-xs text-gray-850 dark:text-gray-200 leading-relaxed font-medium">
                    "{req.reason}"
                  </p>
                </div>

                {/* AI Risk Scores */}
                <div className="p-3 bg-gray-50 dark:bg-slate-900 border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <FiActivity /> AI Risk Score
                    </span>
                    <span className={`text-xs font-extrabold ${req.risk_score > 0.7 ? 'text-red-500' : req.risk_score > 0.4 ? 'text-amber-500' : 'text-green-500'}`}>
                      {req.risk_score * 100}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-650 dark:text-gray-300 leading-relaxed">
                    <strong>Factors</strong>: {req.risk_reason || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action buttons (only for pending) */}
              {req.status === 'Pending' && (
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-800">
                  <button 
                    onClick={() => openReviewModal(req, 'Rejected')}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FiXCircle /> Deny Request
                  </button>
                  <button 
                    onClick={() => openReviewModal(req, 'Approved')}
                    className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <FiCheckCircle /> Approve Access
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {reviewAction === 'Approved' ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-red-500" />}
                Confirm {reviewAction} Action
              </h3>
            </div>
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg text-xs space-y-1">
                <p><span className="text-gray-400">Requester:</span> <strong>{selectedReq.requester_name}</strong></p>
                <p><span className="text-gray-400">Resource:</span> <strong>{selectedReq.resource_name}</strong></p>
                <p><span className="text-gray-400">Threat Risk:</span> <strong className="text-red-500">{selectedReq.risk_score * 100}%</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">Review Audit Notes (Optional)</label>
                <textarea
                  rows="3"
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Provide audit validation notes for compliance records..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  disabled={reviewLoading}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 ${reviewAction === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {reviewLoading ? 'Processing...' : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequests;
