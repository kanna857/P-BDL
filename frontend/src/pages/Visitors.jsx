import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  FiPlus, FiUserPlus, FiUserCheck, FiClock, FiCheck, 
  FiSearch, FiAlertTriangle, FiPrinter, FiX 
} from 'react-icons/fi';

const Visitors = () => {
  const { user } = useAuth();
  const [passes, setPasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration Form state
  const [showRegForm, setShowRegForm] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    room_id: '',
    purpose: '',
    starts_at: '',
    expires_at: ''
  });
  const [regLoading, setRegLoading] = useState(false);

  // QR Modal state
  const [selectedPass, setSelectedPass] = useState(null);

  const fetchPasses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/visitors');
      setPasses(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch visitor list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms');
      setRooms(response.data);
    } catch (err) {
      // Fail silently for rooms dropdown
    }
  };

  useEffect(() => {
    fetchPasses();
    fetchRooms();
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.starts_at || !form.expires_at) {
      alert("Please fill in all required fields.");
      return;
    }
    setRegLoading(true);
    try {
      const payload = {
        visitor: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          company: form.company || null
        },
        room_id: form.room_id ? parseInt(form.room_id) : null,
        purpose: form.purpose || null,
        starts_at: new Date(form.starts_at).toISOString(),
        expires_at: new Date(form.expires_at).toISOString()
      };
      
      const response = await api.post('/visitors', payload);
      setPasses(prev => [response.data, ...prev]);
      
      // Reset form
      setForm({
        first_name: '',
        last_name: '',
        email: '',
        company: '',
        room_id: '',
        purpose: '',
        starts_at: '',
        expires_at: ''
      });
      setShowRegForm(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register visitor.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleCheckIn = async (passId) => {
    try {
      const response = await api.post(`/visitors/${passId}/checkin`);
      setPasses(prev => prev.map(p => p.id === passId ? response.data : p));
      if (selectedPass?.id === passId) {
        setSelectedPass(response.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update check-in status.');
    }
  };

  const handleApprove = async (passId, status) => {
    try {
      const response = await api.post(`/visitors/${passId}/approve`, {
        status: status,
        notes: "Approved via dashboard actions."
      });
      setPasses(prev => prev.map(p => p.id === passId ? response.data : p));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to process visitor approval.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiUserCheck className="text-microsoft-blue" />
            Visitor Pass Management
          </h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
            Issue time-boxed workspace access QR keys, log visitor histories, and verify host check-ins.
          </p>
        </div>
        <button
          onClick={() => setShowRegForm(true)}
          className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <FiUserPlus /> Register Visitor
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs">
          <FiAlertTriangle className="text-lg flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Passes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-xs text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-microsoft-blue mr-2"></div>
          Loading visitor database...
        </div>
      ) : passes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-microsoft-cardDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-xl shadow-sm space-y-3">
          <p className="text-gray-400 text-xs">No active or pending visitor passes registered.</p>
          <button 
            onClick={() => setShowRegForm(true)}
            className="px-3 py-1.5 border border-microsoft-blue text-microsoft-blue hover:bg-microsoft-blueLight text-xs font-semibold rounded-lg"
          >
            Create first pass
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-600 dark:text-gray-400 border-b border-microsoft-borderLight dark:border-microsoft-borderDark font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Visitor</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Target Area</th>
                  <th className="px-6 py-3.5">Validation Range</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                {passes.map((pass) => (
                  <tr key={pass.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/10">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100">
                          {pass.visitor?.first_name} {pass.visitor?.last_name}
                        </p>
                        <p className="text-[10px] text-gray-400">{pass.visitor?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{pass.visitor?.company || 'N/A'}</td>
                    <td className="px-6 py-4 font-medium">{pass.room_name || 'General Campus'}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                          Start: {new Date(pass.starts_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Expires: {new Date(pass.expires_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        pass.status === 'Checked In' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-300'
                          : pass.status === 'Checked Out'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          : pass.status === 'Active'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                          : pass.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-300'
                      }`}>
                        {pass.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {pass.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(pass.id, 'Rejected')}
                            className="px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                          >
                            Deny
                          </button>
                          <button 
                            onClick={() => handleApprove(pass.id, 'Approved')}
                            className="px-2.5 py-1 text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 rounded shadow-sm"
                          >
                            Approve
                          </button>
                        </>
                      )}

                      {pass.status === 'Active' && (
                        <button
                          onClick={() => handleCheckIn(pass.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-microsoft-blue text-white hover:bg-microsoft-blueHover rounded shadow-sm"
                        >
                          Check In
                        </button>
                      )}

                      {pass.status === 'Checked In' && (
                        <button
                          onClick={() => handleCheckIn(pass.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-750 rounded shadow-sm"
                        >
                          Check Out
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedPass(pass)}
                        className="px-2 py-1 text-[10px] border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 rounded font-bold"
                      >
                        View Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registration Form Modal */}
      {showRegForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/30">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FiUserPlus className="text-microsoft-blue" />
                Register Temporary Visitor Pass
              </h3>
              <button onClick={() => setShowRegForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">First Name *</label>
                  <input
                    required
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                    placeholder="e.g. Marie"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Last Name *</label>
                  <input
                    required
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                    placeholder="e.g. Curie"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                    placeholder="marie@curie.org"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Company / Affiliate</label>
                  <input
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                    placeholder="Sorbonne Lab"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Authorized Area Dropdown</label>
                  <select
                    value={form.room_id}
                    onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  >
                    <option value="">General Access (Cafeteria / Reception)</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.room_type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Business Purpose</label>
                  <input
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                    placeholder="Research Consultation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Valdity Start Date/Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 mb-1 uppercase tracking-wider">Expiration Date/Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowRegForm(false)}
                  disabled={regLoading}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {regLoading ? 'Registering...' : 'Register Visitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Pass Details Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-550 dark:text-gray-300">Temporary Access Badge</h3>
              <button onClick={() => setSelectedPass(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <FiX />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center text-center space-y-4 bg-gray-50/50 dark:bg-slate-900/10">
              {/* Entra ID styled badge visual header */}
              <div className="w-full bg-microsoft-blue text-white p-3 rounded-lg flex items-center justify-between shadow-sm">
                <span className="font-bold text-xs tracking-wider uppercase">visitor pass</span>
                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold">ENTRA SECURE</span>
              </div>
              
              {/* Visual QR code generation using free, standard QR API */}
              <div className="bg-white p-3 rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${selectedPass.qr_code_token}`} 
                  alt="Visitor QR Token" 
                  className="w-40 h-40"
                />
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-150">
                  {selectedPass.visitor?.first_name} {selectedPass.visitor?.last_name}
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold">{selectedPass.visitor?.company || 'External Guest'}</p>
              </div>

              <div className="w-full border-t border-gray-200 dark:border-gray-800 pt-3 text-[10px] space-y-1.5 text-left text-gray-600 dark:text-gray-300">
                <p><span className="text-gray-400">Allowed Area:</span> <strong>{selectedPass.room_name || 'General Access'}</strong></p>
                <p><span className="text-gray-400">Token ID:</span> <strong className="font-mono text-microsoft-blue">{selectedPass.qr_code_token}</strong></p>
                <p><span className="text-gray-400">Valid Ends:</span> <strong>{new Date(selectedPass.expires_at).toLocaleString()}</strong></p>
              </div>
              
              <div className="w-full flex justify-between gap-3 pt-3">
                <button
                  onClick={() => window.print()}
                  className="w-1/2 py-2 border border-gray-300 text-gray-600 hover:bg-gray-150 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <FiPrinter /> Print Pass
                </button>
                {selectedPass.status === 'Active' && (
                  <button
                    onClick={() => handleCheckIn(selectedPass.id)}
                    className="w-1/2 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    Check In
                  </button>
                )}
                {selectedPass.status === 'Checked In' && (
                  <button
                    onClick={() => handleCheckIn(selectedPass.id)}
                    className="w-1/2 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    Check Out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;
