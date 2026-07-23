import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  FiUsers, FiShield, FiLayers, FiActivity, 
  FiArrowRight, FiCheckCircle, FiAlertTriangle, FiRefreshCw
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const REFRESH_INTERVAL = 30000; // 30 seconds

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return '👋 Good Morning';
  if (h < 17) return '👋 Good Afternoon';
  return '👋 Good Evening';
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '—';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [stats, setStats] = useState(null);
  const [deptChartData, setDeptChartData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!loading) setRefreshing(true);

    try {
      // 1. Stats (core numbers + insights)
      try {
        const statsResp = await api.get('/audit/stats');
        if (statsResp.data) setStats(statsResp.data);
      } catch (e) {
        console.warn('Stats fetch failed:', e.message);
      }

      // 2. Department chart
      try {
        const deptResp = await api.get('/departments');
        if (deptResp.data?.length > 0) {
          setDeptChartData(deptResp.data.map(d => ({
            name: d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name,
            Users: d.user_count || 0
          })));
        }
      } catch (e) {
        console.warn('Departments fetch failed:', e.message);
      }

      // 3. Recent audit logs (permission-guarded)
      if (hasPermission('audit:read')) {
        try {
          const logsResp = await api.get('/audit/logs?limit=5');
          if (logsResp.data) setRecentLogs(logsResp.data);
        } catch (e) {
          console.warn('Audit logs fetch failed:', e.message);
        }
      }

      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasPermission]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => fetchDashboardData(), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  // Build sparkline from history trend (approximation based on current value)
  const buildSpark = (current, color) => {
    if (current == null) return [];
    const base = Math.max(0, current - 3);
    return [
      { v: base },
      { v: base + 1 },
      { v: Math.max(base, current - 1) },
      { v: current },
      { v: current },
    ];
  };

  const cardConfig = stats ? [
    {
      title: 'Total Users',
      value: stats.total_users,
      spark: buildSpark(stats.total_users),
      color: '#0078d4',
      text: `${stats.active_sessions} active sessions`,
      glowClass: 'glow-blue',
      path: '/users',
      perm: 'users:read'
    },
    {
      title: 'Enterprise Roles',
      value: stats.total_roles,
      spark: buildSpark(stats.total_roles),
      color: '#8b5cf6',
      text: `Across ${stats.total_departments} departments`,
      glowClass: 'glow-purple',
      path: '/roles',
      perm: 'roles:read'
    },
    {
      title: 'Departments',
      value: stats.total_departments,
      spark: buildSpark(stats.total_departments),
      color: '#0d9488',
      text: `${stats.active_policies || 0} active policies`,
      glowClass: 'glow-teal',
      path: '/departments',
      perm: 'departments:read'
    },
    {
      title: 'Active Sessions',
      value: stats.active_sessions,
      spark: buildSpark(stats.active_sessions),
      color: '#ea580c',
      text: `${stats.failed_logins_24h} failed logins (24h)`,
      glowClass: 'glow-orange',
      path: '/login-history',
      perm: 'login_history:read'
    }
  ] : [];

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateY = ((x - xc) / xc) * 12;
    const rotateX = ((yc - y) / yc) * 12;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    card.style.backgroundImage = `radial-gradient(circle 140px at ${x}px ${y}px, rgba(255,255,255,0.06), transparent 80%)`;
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)`;
    card.style.backgroundImage = 'none';
  };

  // Compute identity risk from open alerts
  const identityRisk = stats
    ? stats.open_security_alerts > 5 ? { label: 'HIGH', color: 'text-red-400', dot: 'bg-red-500' }
      : stats.open_security_alerts > 0 ? { label: 'MEDIUM', color: 'text-amber-400', dot: 'bg-amber-500' }
      : { label: 'LOW', color: 'text-emerald-400', dot: 'bg-emerald-500' }
    : { label: '...', color: 'text-gray-400', dot: 'bg-gray-500' };

  return (
    <div className="space-y-6 text-gray-200">

      {/* 1. Hero Banner */}
      <div className="glass-card animate-3d-entry stagger-1 p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col lg:flex-row items-stretch justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Left: Welcome + Quick Stats */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {getGreeting()},{' '}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  {user?.first_name || 'Global'} {user?.last_name || 'Administrator'}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Here's what's happening in your identity environment
              </p>
            </div>
            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Refresh data"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-gray-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg bg-slate-950/40 hover:bg-slate-900/60 transition-all disabled:opacity-50"
            >
              <FiRefreshCw className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
              {lastRefresh ? `Updated ${formatTimeAgo(lastRefresh)}` : 'Refresh'}
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Identity Risk</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${identityRisk.dot} status-active-dot`}></span>
                <span className={`text-xs font-bold ${identityRisk.color}`}>{identityRisk.label}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Security Alerts</p>
              <p className="text-sm font-bold text-white mt-1">
                {loading ? '...' : stats?.open_security_alerts ?? 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Active Policies</p>
              <p className="text-sm font-bold text-violet-400 mt-1">
                {loading ? '...' : stats?.active_policies ?? 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Last Sync</p>
              <p className="text-sm font-bold text-blue-400 mt-1">
                {lastRefresh ? formatTimeAgo(lastRefresh) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Today's Insights (REAL DATA) */}
        <div className="w-full lg:w-[320px] bg-slate-950/30 border border-slate-800/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              ✦ Today's Insights
            </h4>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 rounded bg-slate-800/60 animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${(stats?.pending_access_requests || 0) > 0 ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
                  {(stats?.pending_access_requests || 0) > 0
                    ? `${stats.pending_access_requests} Pending Access Request${stats.pending_access_requests !== 1 ? 's' : ''}`
                    : 'No Pending Access Requests'}
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${(stats?.expiring_visitor_passes || 0) > 0 ? 'bg-amber-500' : 'bg-gray-600'}`}></span>
                  {(stats?.expiring_visitor_passes || 0) > 0
                    ? `${stats.expiring_visitor_passes} Visitor Pass${stats.expiring_visitor_passes !== 1 ? 'es' : ''} Expiring Soon`
                    : 'No Visitor Passes Expiring'}
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${(stats?.failed_logins_24h || 0) > 0 ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                  {(stats?.failed_logins_24h || 0) > 0
                    ? `${stats.failed_logins_24h} Failed Login Attempt${stats.failed_logins_24h !== 1 ? 's' : ''} (24h)`
                    : 'No Failed Logins (24h)'}
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${(stats?.open_security_alerts || 0) === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {(stats?.open_security_alerts || 0) === 0
                    ? 'All Systems Operational'
                    : `${stats.open_security_alerts} Open Security Alert${stats.open_security_alerts !== 1 ? 's' : ''}`}
                </li>
              </ul>
            )}
          </div>
          <button
            onClick={() => navigate('/audit-logs')}
            className="mt-4 w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-gray-300 rounded-lg hover:text-white transition-all text-center"
          >
            View All Logs
          </button>
        </div>

        {/* Right: Glowing Shield */}
        <div className="hidden lg:flex items-center justify-center px-4 animate-float">
          <svg className="w-36 h-36 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="48" r="34" stroke="#2563eb" strokeWidth="0.75" strokeDasharray="6 8" className="animate-rotate-slow opacity-60" />
            <circle cx="50" cy="48" r="40" stroke="#8b5cf6" strokeWidth="0.5" strokeDasharray="3 6" className="animate-rotate-reverse-slow opacity-40" />
            <path d="M50 12 L82 22 V48 C82 67 69 82 50 87 C31 82 18 67 18 48 V22 L50 12 Z" stroke="#2563eb" strokeWidth="2.5" fill="url(#shieldGrad)" />
            <path d="M50 19 L75 27 V48 C75 62 65 74 50 79 C35 74 25 62 25 48 V27 L50 19 Z" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 2" fill="none" />
            <circle cx="50" cy="48" r="10" stroke="#3b82f6" strokeWidth="2" fill="#080c1c" className="animate-ping" style={{ animationDuration: '3s' }} />
            <polygon points="50,38 58,54 42,54" fill="#60a5fa" className="opacity-80" />
            <defs>
              <radialGradient id="shieldGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.08" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-3d-entry stagger-2">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border border-slate-800/40 h-28 animate-pulse bg-slate-900/20" />
            ))
          : cardConfig.map((card, idx) => {
              const showCardLink = hasPermission(card.perm);
              return (
                <div
                  key={idx}
                  className={`glass-card p-5 rounded-2xl border flex items-center justify-between group cursor-pointer ${card.glowClass}`}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: 'transform 0.12s ease-out, box-shadow 0.3s ease, border-color 0.3s ease' }}
                >
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{card.title}</span>
                    <h3 className="text-3xl font-extrabold text-white tracking-tight">
                      {String(card.value ?? 0).padStart(2, '0')}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">{card.text}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full space-y-4">
                    <div className="h-10 w-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={card.spark}>
                          <Line type="monotone" dataKey="v" stroke={card.color} strokeWidth={1.8} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {showCardLink && (
                      <button
                        onClick={() => navigate(card.path)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors opacity-0 group-hover:opacity-100"
                      >
                        View <FiArrowRight />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      {/* 3. Main Data Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left (span-2): Chart + Timeline */}
        <div className="lg:col-span-2 space-y-6">

          {/* Department Bar Chart */}
          <div className="glass-card animate-3d-entry stagger-3 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">User Distribution by Department</h3>
              <span className="text-[10px] text-gray-500 font-mono">Live</span>
            </div>
            <div className="h-[280px] w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 animate-pulse">
                  Loading directory graph...
                </div>
              ) : deptChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No department data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(8,12,28,0.9)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#f3f4f6',
                        backdropFilter: 'blur(10px)'
                      }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Bar dataKey="Users" fill="url(#barGradBlue)" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Directory Activity */}
          <div className="glass-card animate-3d-entry stagger-4 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Recent Directory Activity</h3>
              <button
                onClick={() => navigate('/audit-logs')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                View All Logs <FiArrowRight className="text-xs" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-900/40 animate-pulse" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No recent activity to display.</p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentLogs.map((log, logIdx) => {
                    const isFailure = log.action?.includes('FAIL') || log.action?.includes('FAILED');
                    const label = log.action?.replace(/_/g, ' ') || 'Event';
                    const detail = log.details
                      ? (typeof log.details === 'object'
                          ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                          : String(log.details))
                      : `${log.resource_type || 'System'} event recorded`;

                    return (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== recentLogs.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-slate-900/30 ${
                                isFailure ? 'bg-red-950 border border-red-500/30' : 'bg-blue-950 border border-blue-500/30'
                              }`}>
                                {isFailure
                                  ? <FiAlertTriangle className="text-xs text-red-400" />
                                  : <FiCheckCircle className="text-xs text-blue-400" />}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 flex justify-between items-start gap-4">
                              <div className="text-xs text-gray-300">
                                <span className="font-bold text-white">{label}</span>
                                <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-xs">{detail}</p>
                              </div>
                              <div className="flex items-center gap-3 text-right flex-shrink-0">
                                <span className="text-[10px] text-gray-500">{formatTimeAgo(log.timestamp)}</span>
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-mono ${
                                  isFailure
                                    ? 'bg-red-950/30 text-red-400 border-red-500/20'
                                    : 'bg-blue-950/30 text-blue-400 border-blue-500/20'
                                }`}>
                                  {log.action}
                                </span>
                                {log.ip_address && (
                                  <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">{log.ip_address}</span>
                                )}
                                <span className={`w-1.5 h-1.5 rounded-full ${isFailure ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* AI Security Insights (live from stats) */}
          <div className="glass-card animate-3d-entry stagger-3 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <span className="text-blue-400 font-bold">AI</span> Security Insights
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-slate-900/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/40">
                  {(stats?.open_security_alerts || 0) === 0
                    ? <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                    : <FiAlertTriangle className="text-red-500 text-sm mt-0.5 flex-shrink-0 animate-pulse" />}
                  <div className="text-xs">
                    <p className="font-semibold text-gray-200">
                      {(stats?.open_security_alerts || 0) === 0 ? 'Access patterns are normal' : `${stats.open_security_alerts} security alert${stats.open_security_alerts !== 1 ? 's' : ''} open`}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      {(stats?.open_security_alerts || 0) === 0 ? 'No unusual activity detected' : 'Immediate review recommended'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/40">
                  {(stats?.failed_logins_24h || 0) === 0
                    ? <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                    : <FiAlertTriangle className="text-amber-500 text-sm mt-0.5 flex-shrink-0 animate-pulse" />}
                  <div className="text-xs">
                    <p className="font-semibold text-gray-200">
                      {(stats?.failed_logins_24h || 0) === 0 ? 'No failed logins in 24h' : `${stats.failed_logins_24h} failed login${stats.failed_logins_24h !== 1 ? 's' : ''} detected`}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      {(stats?.failed_logins_24h || 0) === 0 ? 'All authentication successful' : 'Review login history for details'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/40">
                  {(stats?.expiring_visitor_passes || 0) === 0
                    ? <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                    : <FiAlertTriangle className="text-amber-400 text-sm mt-0.5 flex-shrink-0" />}
                  <div className="text-xs">
                    <p className="font-semibold text-gray-200">
                      {(stats?.expiring_visitor_passes || 0) === 0 ? 'All visitor passes valid' : `${stats.expiring_visitor_passes} pass${stats.expiring_visitor_passes !== 1 ? 'es' : ''} expiring soon`}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      {(stats?.expiring_visitor_passes || 0) === 0 ? 'No action required for guests' : 'Review visitor management'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/40">
                  <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-gray-200">
                      {(stats?.active_policies || 0)} active polic{(stats?.active_policies || 0) !== 1 ? 'ies' : 'y'} enforced
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Governance compliance maintained</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Banner */}
            {!loading && (stats?.pending_access_requests > 0 || stats?.open_security_alerts > 0) && (
              <div className="bg-indigo-950/20 border border-indigo-500/25 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI Recommendation</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {stats?.pending_access_requests > 0
                    ? `${stats.pending_access_requests} access request${stats.pending_access_requests !== 1 ? 's' : ''} await${stats.pending_access_requests === 1 ? 's' : ''} your review.`
                    : `${stats.open_security_alerts} open alert${stats.open_security_alerts !== 1 ? 's' : ''} require${stats.open_security_alerts === 1 ? 's' : ''} attention.`}
                </p>
                <button
                  onClick={() => navigate(stats?.pending_access_requests > 0 ? '/access-requests' : '/security')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                  Review Now
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card animate-3d-entry stagger-4 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <h3 className="font-bold text-white text-sm">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {hasPermission('users:write') && (
                <button onClick={() => navigate('/users')} className="flex flex-col items-start p-3 rounded-xl border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all group">
                  <div className="p-2 rounded-lg bg-blue-900/30 text-blue-400 border border-blue-500/20 mb-3 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                    <FiUsers className="text-sm" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">Create User</span>
                  <span className="text-[9px] text-gray-500 mt-1">Add to directory</span>
                </button>
              )}
              {hasPermission('roles:write') && (
                <button onClick={() => navigate('/roles')} className="flex flex-col items-start p-3 rounded-xl border border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 text-left transition-all group">
                  <div className="p-2 rounded-lg bg-violet-900/30 text-violet-400 border border-violet-500/20 mb-3 shadow-[0_0_10px_rgba(139,92,246,0.15)]">
                    <FiShield className="text-sm" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-violet-400 transition-colors">Configure Roles</span>
                  <span className="text-[9px] text-gray-500 mt-1">Manage permissions</span>
                </button>
              )}
              {hasPermission('departments:write') && (
                <button onClick={() => navigate('/departments')} className="flex flex-col items-start p-3 rounded-xl border border-teal-500/20 hover:border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10 text-left transition-all group">
                  <div className="p-2 rounded-lg bg-teal-900/30 text-teal-400 border border-teal-500/20 mb-3 shadow-[0_0_10px_rgba(13,148,136,0.15)]">
                    <FiLayers className="text-sm" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-teal-400 transition-colors">Add Department</span>
                  <span className="text-[9px] text-gray-500 mt-1">Create new unit</span>
                </button>
              )}
              <button onClick={() => navigate('/login-history')} className="flex flex-col items-start p-3 rounded-xl border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 text-left transition-all group">
                <div className="p-2 rounded-lg bg-orange-900/30 text-orange-400 border border-orange-500/20 mb-3 shadow-[0_0_10px_rgba(234,88,12,0.15)]">
                  <FiActivity className="text-sm" />
                </div>
                <span className="text-xs font-semibold text-white group-hover:text-orange-400 transition-colors">View Sessions</span>
                <span className="text-[9px] text-gray-500 mt-1">Monitor active users</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
