import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import { 
  FiShield, FiActivity, FiAlertOctagon, FiCpu, 
  FiCheckCircle, FiSearch, FiPlay, FiAlertTriangle 
} from 'react-icons/fi';

const Security = () => {
  const [alerts, setAlerts] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [retrainStatus, setRetrainStatus] = useState('');
  const [retrainLoading, setRetrainLoading] = useState(false);

  const fetchSecurityData = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertsRes, scoresRes] = await Promise.all([
        api.get('/security/alerts'),
        api.get('/security/scores')
      ]);
      setAlerts(alertsRes.data);
      setScores(scoresRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch security log records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRetrain = async () => {
    setRetrainLoading(true);
    setRetrainStatus('');
    try {
      const response = await api.post('/security/train');
      setRetrainStatus(`Success! Method: ${response.data.method}. Processed ${response.data.samples_processed} samples. Alerts created: ${response.data.alerts_created}`);
      // Refresh scores and alerts
      await fetchSecurityData();
    } catch (err) {
      setRetrainStatus(err.response?.data?.detail || 'Retraining pipeline encountered mathematical exception.');
    } finally {
      setRetrainLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const response = await api.put(`/security/alerts/${alertId}`, { status: 'Resolved' });
      setAlerts(prev => prev.map(a => a.id === alertId ? response.data : a));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve alert.');
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const term = search.toLowerCase();
    return (
      a.title?.toLowerCase().includes(term) ||
      a.description?.toLowerCase().includes(term) ||
      a.user_email?.toLowerCase().includes(term) ||
      a.ip_address?.includes(term)
    );
  });

  // Prepare chart data aggregating anomaly trends
  const chartData = scores.slice(0, 10).reverse().map((s, idx) => ({
    name: `Log ${idx + 1}`,
    'Anomaly Score': s.anomaly_score * 100,
    threshold: 50
  }));

  // Fallback static chart data if no scores exist yet
  const defaultChartData = [
    { name: 'Monday', 'Anomaly Score': 12, threshold: 50 },
    { name: 'Tuesday', 'Anomaly Score': 25, threshold: 50 },
    { name: 'Wednesday', 'Anomaly Score': 88, threshold: 50 }, // Outlier peak
    { name: 'Thursday', 'Anomaly Score': 15, threshold: 50 },
    { name: 'Friday', 'Anomaly Score': 32, threshold: 50 },
    { name: 'Saturday', 'Anomaly Score': 8, threshold: 50 },
    { name: 'Sunday', 'Anomaly Score': 14, threshold: 50 },
  ];

  const finalChartData = chartData.length > 0 ? chartData : defaultChartData;

  // Key metrics calculations
  const openAlertsCount = alerts.filter(a => a.status === 'Open').length;
  const criticalAlertsCount = alerts.filter(a => a.severity === 'Critical' || a.severity === 'High').length;
  const averageAnomalyScore = scores.length > 0 
    ? Math.round((scores.reduce((acc, curr) => acc + curr.anomaly_score, 0) / scores.length) * 100) 
    : 18;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiShield className="text-microsoft-blue" />
            AI Security & Threat Monitoring
          </h2>
          <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
            Analyze biometric/IP swipe anomalies, run outlier models, and process threat incident alerts.
          </p>
        </div>
        
        {/* Retrain Trigger Button */}
        <button
          onClick={handleRetrain}
          disabled={retrainLoading}
          className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-55 transition-colors"
        >
          <FiCpu /> {retrainLoading ? 'Executing Models...' : 'Run Anomaly Detection (Isolation Forest)'}
        </button>
      </div>

      {/* Retrain Status Banner */}
      {retrainStatus && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${retrainStatus.includes('Success') ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'}`}>
          {retrainStatus.includes('Success') ? <FiCheckCircle /> : <FiAlertTriangle />}
          <span>{retrainStatus}</span>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center justify-center text-xl">
            <FiAlertOctagon />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Incidents</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-150">{openAlertsCount} Alerts</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 flex items-center justify-center text-xl">
            <FiAlertTriangle />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Critical/High Severity</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-150">{criticalAlertsCount} Threats</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 flex items-center justify-center text-xl">
            <FiActivity />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Average Anomaly Index</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-150">{averageAnomalyScore}% Risk</h3>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm">
        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
          <FiActivity className="text-microsoft-blue" />
          AI Threat Vector Peak (Isolation Forest & LOF Scores)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={finalChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0078d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0078d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-850" />
              <XAxis dataKey="name" className="text-[10px] fill-gray-400" />
              <YAxis className="text-[10px] fill-gray-400" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f1f1f', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="Anomaly Score" 
                stroke="#0078d4" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#anomalyGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Security alerts list */}
      <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark bg-gray-50/50 dark:bg-slate-900/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiAlertOctagon className="text-microsoft-blue" />
            Active Threat Alerts Queue
          </h3>
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by title, IP, user email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
            />
          </div>
        </div>

        {/* Alerts Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-microsoft-blue mr-2"></div>
            Analyzing login databases...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-xs">
            No active threat alerts in logs.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-600 dark:text-gray-400 font-semibold border-b border-microsoft-borderLight dark:border-microsoft-borderDark">
                <tr>
                  <th className="px-6 py-3">Alert Incident</th>
                  <th className="px-6 py-3">User Subject</th>
                  <th className="px-6 py-3">Source IP</th>
                  <th className="px-6 py-3">Threat Index</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-850 dark:text-gray-250">
                {filteredAlerts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/10">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-850 dark:text-gray-100">{a.title}</p>
                        <p className="text-[10px] text-gray-450 dark:text-gray-500 font-mono mt-0.5 leading-relaxed">{a.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{a.user_email}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-650 dark:text-gray-400">{a.ip_address || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-microsoft-blue">{Math.round(a.risk_score * 100)}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.severity === 'Critical' || a.severity === 'High'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{a.status}</td>
                    <td className="px-6 py-4 text-right">
                      {a.status === 'Open' ? (
                        <button
                          onClick={() => handleResolveAlert(a.id)}
                          className="px-2.5 py-1 text-[10px] bg-green-600 text-white hover:bg-green-700 font-bold rounded shadow-sm transition-colors"
                        >
                          Resolve Alert
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 justify-end font-semibold">
                          <FiCheckCircle className="text-green-500" /> Resolved
                        </span>
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
  );
};

export default Security;
