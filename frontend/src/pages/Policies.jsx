import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  FiBookOpen, FiFileText, FiPlus, FiPlusCircle, 
  FiClock, FiSearch, FiSliders, FiCheckCircle, 
  FiDownload, FiX, FiCheck, FiUsers 
} from 'react-icons/fi';

const Policies = () => {
  const [policies, setPolicies] = useState([]);
  const [reviews, setAccessReviews] = useState([]);
  const [complianceReport, setComplianceReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState(null); // holds policy obj
  const [showAddReview, setShowAddReview] = useState(false);

  // Forms state
  const [policyForm, setPolicyForm] = useState({ name: '', description: '', category: 'Security', content: '' });
  const [versionForm, setVersionForm] = useState({ content: '' });
  const [reviewForm, setReviewForm] = useState({ title: '', reviewer_id: '', due_date: '' });
  
  const [formLoading, setFormLoading] = useState(false);

  const fetchPolicyData = async () => {
    setLoading(true);
    setError('');
    try {
      const [policiesRes, reviewsRes, complianceRes, usersRes] = await Promise.all([
        api.get('/policies'),
        api.get('/access-reviews'),
        api.get('/compliance'),
        api.get('/users')
      ]);
      setPolicies(policiesRes.data);
      setAccessReviews(reviewsRes.data);
      if (complianceRes.data && complianceRes.data.length > 0) {
        setComplianceReport(complianceRes.data[0]);
      }
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch compliance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicyData();
  }, []);

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    if (!policyForm.name || !policyForm.content) return;
    setFormLoading(true);
    try {
      const response = await api.post('/policies', policyForm);
      setPolicies(prev => [response.data, ...prev]);
      setShowAddPolicy(false);
      setPolicyForm({ name: '', description: '', category: 'Security', content: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create policy directive.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    if (!showAddVersion || !versionForm.content) return;
    setFormLoading(true);
    try {
      const response = await api.post(`/policies/${showAddVersion.id}/version`, versionForm);
      // Refresh local list
      await fetchPolicyData();
      setShowAddVersion(null);
      setVersionForm({ content: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update policy version.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.title || !reviewForm.reviewer_id || !reviewForm.due_date) return;
    setFormLoading(true);
    try {
      const response = await api.post('/access-reviews', {
        title: reviewForm.title,
        reviewer_id: parseInt(reviewForm.reviewer_id),
        due_date: new Date(reviewForm.due_date).toISOString()
      });
      setAccessReviews(prev => [response.data, ...prev]);
      setShowAddReview(false);
      setReviewForm({ title: '', reviewer_id: '', due_date: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create review campaign.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateReviewStatus = async (reviewId, status) => {
    try {
      const response = await api.put(`/access-reviews/${reviewId}`, { status });
      setAccessReviews(prev => prev.map(r => r.id === reviewId ? response.data : r));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update review campaign.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/audit-logs');
      const auditData = response.data;
      if (!auditData || auditData.length === 0) {
        alert("No audit logs found to export.");
        return;
      }

      // Format as CSV
      const headers = ['ID', 'User ID', 'User Email', 'Action', 'Resource Type', 'Resource ID', 'Timestamp', 'IP Address'];
      const csvRows = [headers.join(',')];

      for (const row of auditData) {
        const values = [
          row.id,
          row.user_id || 'System',
          row.user_email || 'System',
          `"${row.action}"`,
          row.resource_type,
          row.resource_id || 'N/A',
          row.timestamp,
          row.ip_address || 'N/A'
        ];
        csvRows.push(values.join(','));
      }

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `entra_governance_audit_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export audit logs CSV.");
    }
  };

  // Build chart compliance data
  const chartData = complianceReport?.details?.department_breakdown 
    ? Object.entries(complianceReport.details.department_breakdown).map(([name, score]) => ({
        name,
        'Compliance Rate (%)': score,
        threshold: 90
      }))
    : [
        { name: 'Engineering', 'Compliance Rate (%)': 96 },
        { name: 'HR Operations', 'Compliance Rate (%)': 88 },
        { name: 'Security Ops', 'Compliance Rate (%)': 100 },
        { name: 'Executive Office', 'Compliance Rate (%)': 94 },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiBookOpen className="text-microsoft-blue" />
            Compliance Directive & Policy Center
          </h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
            Author corporate security bounds, review department audit ratings, and trigger clearance review sweeps.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <FiDownload /> Export Audit CSV
          </button>
          <button
            onClick={() => setShowAddPolicy(true)}
            className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <FiPlus /> New Policy
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Policies and reviews list (Left) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Policy cards */}
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiFileText className="text-microsoft-blue" />
              Corporate Compliance Directives
            </h3>
            
            {loading ? (
              <p className="text-xs text-gray-400 py-4">Reading active policies...</p>
            ) : policies.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No policies seeded. Create one to start.</p>
            ) : (
              <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-800">
                {policies.map((p) => {
                  const latestVer = p.versions?.[0] || { version: 1, content: 'N/A' };
                  return (
                    <div key={p.id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">{p.name}</h4>
                          <p className="text-[10px] text-gray-400 font-medium">Category: {p.category} | Active Version: v{latestVer.version}</p>
                        </div>
                        <button
                          onClick={() => setShowAddVersion(p)}
                          className="text-[10px] font-bold text-microsoft-blue hover:underline flex items-center gap-1"
                        >
                          <FiPlusCircle /> New Version
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">{p.description}</p>
                      
                      <div className="p-3 bg-gray-50 dark:bg-slate-900 border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">policy content body</p>
                        <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{latestVer.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Access Reviews list */}
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FiUsers className="text-microsoft-blue" />
                Access Review Campaigns
              </h3>
              <button
                onClick={() => setShowAddReview(true)}
                className="text-[10px] font-bold text-microsoft-blue hover:underline flex items-center gap-1"
              >
                <FiPlusCircle /> New Campaign
              </button>
            </div>
            
            {loading ? (
              <p className="text-xs text-gray-400 py-4">Checking review status...</p>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No active audit campaigns.</p>
            ) : (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead className="text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="py-2 font-bold uppercase tracking-wider">Campaign Name</th>
                      <th className="py-2 font-bold uppercase tracking-wider">Assigned Auditor</th>
                      <th className="py-2 font-bold uppercase tracking-wider">Due Date</th>
                      <th className="py-2 font-bold uppercase tracking-wider">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 font-semibold text-gray-800 dark:text-gray-150">{r.title}</td>
                        <td className="py-3 text-gray-500 font-medium">{r.reviewer_name}</td>
                        <td className="py-3 text-gray-500">{new Date(r.due_date).toLocaleDateString()}</td>
                        <td className="py-3 font-semibold">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                            r.status === 'Completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/20'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {r.status === 'Pending' ? (
                            <button
                              onClick={() => handleUpdateReviewStatus(r.id, 'Completed')}
                              className="px-2 py-0.5 bg-microsoft-blue text-white text-[10px] font-bold rounded shadow-sm hover:bg-microsoft-blueHover"
                            >
                              Finalize Review
                            </button>
                          ) : (
                            <span className="text-[10px] text-green-600 font-semibold flex items-center justify-end gap-1"><FiCheckCircle /> Checked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Charts & reports (Right) */}
        <div className="space-y-6">
          
          {/* Department breakdown chart */}
          <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiSliders className="text-microsoft-blue" />
              Compliance Score by Department
            </h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis dataKey="name" className="text-[9px] fill-gray-400" />
                  <YAxis className="text-[9px] fill-gray-400" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f1f1f', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="Compliance Rate (%)" fill="#0078d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-slate-900 border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Overall Audit Score</p>
              <h4 className="text-xl font-black text-microsoft-blue mt-1">94.5% Compliant</h4>
              <p className="text-[10px] text-gray-500 mt-1">Enforced across 4 departments with 92% active coverage rating.</p>
            </div>
          </div>

        </div>

      </div>

      {/* Add Policy Modal */}
      {showAddPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-150">Create Corporate Access Directive</h3>
              <button onClick={() => setShowAddPolicy(false)} className="text-gray-450 hover:text-gray-650 p-1 hover:bg-gray-150 dark:hover:bg-gray-800 rounded">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreatePolicy} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Policy Title *</label>
                <input
                  required
                  value={policyForm.name}
                  onChange={e => setPolicyForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  placeholder="e.g. Least Privilege SW Access Control Policy"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={policyForm.category}
                    onChange={e => setPolicyForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  >
                    <option>Security</option>
                    <option>Access</option>
                    <option>Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Directive Description</label>
                  <input
                    value={policyForm.description}
                    onChange={e => setPolicyForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                    placeholder="Short description of directive scope"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Markdown Policy Content Body *</label>
                <textarea
                  required
                  rows="5"
                  value={policyForm.content}
                  onChange={e => setPolicyForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Type policy details..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPolicy(false)}
                  disabled={formLoading}
                  className="px-4 py-2 border border-gray-305 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {formLoading ? 'Publishing...' : 'Publish Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Version Modal */}
      {showAddVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/10">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-150">Increment Directive Version</h3>
              <button onClick={() => setShowAddVersion(null)} className="text-gray-450 hover:text-gray-650 p-1 hover:bg-gray-150 rounded">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateVersion} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-xs">
                <p><span className="text-gray-400">Target Policy:</span> <strong>{showAddVersion.name}</strong></p>
                <p><span className="text-gray-400">Active Version:</span> <strong>v{showAddVersion.versions?.[0]?.version || 1}</strong></p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Version Content Body *</label>
                <textarea
                  required
                  rows="5"
                  value={versionForm.content}
                  onChange={e => setVersionForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Enter complete updated text for next version release..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddVersion(null)}
                  disabled={formLoading}
                  className="px-4 py-2 border border-gray-305 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {formLoading ? 'Publishing...' : 'Release Next Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Access Review Modal */}
      {showAddReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/10">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-150">Create Clearance Review Campaign</h3>
              <button onClick={() => setShowAddReview(false)} className="text-gray-450 hover:text-gray-650 p-1 hover:bg-gray-150 rounded">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateReview} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Campaign Title *</label>
                <input
                  required
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  placeholder="e.g. Q4 Server Room Swipe Log Verification Campaign"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned Auditor *</label>
                  <select
                    required
                    value={reviewForm.reviewer_id}
                    onChange={e => setReviewForm(f => ({ ...f, reviewer_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  >
                    <option value="">Select Auditor</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role?.name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Due Date *</label>
                  <input
                    required
                    type="date"
                    value={reviewForm.due_date}
                    onChange={e => setReviewForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddReview(false)}
                  disabled={formLoading}
                  className="px-4 py-2 border border-gray-305 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {formLoading ? 'Creating...' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Policies;
