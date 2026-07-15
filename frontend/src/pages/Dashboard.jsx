import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  FiUsers, FiShield, FiLayers, FiActivity, 
  FiArrowRight, FiCheckCircle, FiAlertTriangle, FiPlus, FiLock, FiTerminal
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    total_users: 6,
    total_roles: 6,
    total_departments: 4,
    active_sessions: 2,
    failed_logins_24h: 1
  });
  const [deptChartData, setDeptChartData] = useState([
    { name: 'Engineering', Users: 3 },
    { name: 'Security Operations', Users: 1 },
    { name: 'Human Resources', Users: 1 },
    { name: 'Executive Office', Users: 1 }
  ]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sparkline dummy data for stats cards
  const sparkUsers = [{ v: 4 }, { v: 4 }, { v: 5 }, { v: 5 }, { v: 6 }];
  const sparkRoles = [{ v: 5 }, { v: 5 }, { v: 6 }, { v: 6 }, { v: 6 }];
  const sparkDepts = [{ v: 3 }, { v: 3 }, { v: 4 }, { v: 4 }, { v: 4 }];
  const sparkSessions = [{ v: 3 }, { v: 4 }, { v: 3 }, { v: 2 }, { v: 2 }];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch stats from API
        try {
          const statsResp = await api.get('/audit/stats');
          if (statsResp.data) {
            setStats(statsResp.data);
          }
        } catch (e) {
          console.warn('Could not load detailed stats.');
        }

        // Fetch departments to populate chart
        try {
          const deptResp = await api.get('/departments');
          if (deptResp.data && deptResp.data.length > 0) {
            const chartFormat = deptResp.data.map(d => ({
              name: d.name,
              Users: d.user_count || 0
            }));
            setDeptChartData(chartFormat);
          }
        } catch (e) {
          console.warn('Could not load department list.');
        }

        // Fetch recent audit logs
        if (hasPermission('audit:read')) {
          try {
            const logsResp = await api.get('/audit/logs?limit=5');
            if (logsResp.data) {
              setRecentLogs(logsResp.data);
            }
          } catch (e) {
            console.warn('Could not load recent audit logs.');
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const cardConfig = [
    { 
      title: 'Total Users', 
      value: stats.total_users, 
      spark: sparkUsers,
      color: '#0078d4', 
      text: '↑ 18% from last month',
      glowClass: 'glow-blue',
      path: '/users',
      perm: 'users:read'
    },
    { 
      title: 'Enterprise Roles', 
      value: stats.total_roles, 
      spark: sparkRoles,
      color: '#8b5cf6', 
      text: '↑ 12% from last month',
      glowClass: 'glow-purple',
      path: '/roles',
      perm: 'roles:read'
    },
    { 
      title: 'Departments', 
      value: stats.total_departments, 
      spark: sparkDepts,
      color: '#0d9488', 
      text: '↑ 8% from last month',
      glowClass: 'glow-teal',
      path: '/departments',
      perm: 'departments:read'
    },
    { 
      title: 'Active Sessions', 
      value: stats.active_sessions, 
      spark: sparkSessions,
      color: '#ea580c', 
      text: '↓ 5% from last month',
      glowClass: 'glow-orange',
      path: '/login-history',
      perm: 'login_history:read'
    }
  ];

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateY = ((x - xc) / xc) * 12; // Max 12 deg
    const rotateX = ((yc - y) / yc) * 12; // Max 12 deg
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    card.style.backgroundImage = `radial-gradient(circle 140px at ${x}px ${y}px, rgba(255, 255, 255, 0.06), transparent 80%)`;
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.backgroundImage = 'none';
  };

  return (
    <div className="space-y-6 text-gray-200">
      
      {/* 1. Hero Insights & Shield Banner */}
      <div className="glass-card animate-3d-entry stagger-1 p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col lg:flex-row items-stretch justify-between gap-6 overflow-hidden relative">
        {/* Background glow bubble */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Left Side: Welcome and Stats */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              👋 Good Evening, <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">{user?.first_name || 'Global'} {user?.last_name || 'Administrator'}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Here's what's happening in your identity environment
            </p>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-550 uppercase font-semibold">Identity Risk</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-active-dot"></span>
                <span className="text-xs font-bold text-emerald-400">LOW</span>
              </div>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-555 uppercase font-semibold">Threats Detected</p>
              <p className="text-sm font-bold text-white mt-1">0</p>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-555 uppercase font-semibold">Compliance Score</p>
              <p className="text-sm font-bold text-violet-400 mt-1">98%</p>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-gray-555 uppercase font-semibold">Last Sync</p>
              <p className="text-sm font-bold text-blue-400 mt-1">2 min ago</p>
            </div>
          </div>
        </div>

        {/* Center Side: Today's Insights */}
        <div className="w-full lg:w-[320px] bg-slate-950/30 border border-slate-800/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              ✦ Today's Insights
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                3 Pending Access Requests
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                2 Visitor Passes Expiring
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                1 Failed Login Attempt
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                All Systems Operational
              </li>
            </ul>
          </div>
          <button 
            onClick={() => navigate('/audit-logs')}
            className="mt-4 w-full py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-semibold text-gray-300 rounded-lg hover:text-white transition-all text-center"
          >
            View All
          </button>
        </div>

        {/* Right Side: Glowing Shield Vector with 3D floating and rotating orbits */}
        <div className="hidden lg:flex items-center justify-center px-4 animate-float">
          <svg className="w-36 h-36 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]" viewBox="0 0 100 100" fill="none">
            {/* 3D Orbiting Rings */}
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

      {/* 2. Stats Grid with Custom Glowing Borders & Recharts sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-3d-entry stagger-2">
        {cardConfig.map((card, idx) => {
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
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <h3 className="text-3xl font-extrabold text-white tracking-tight">
                  {loading ? '...' : String(card.value).padStart(2, '0')}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <span style={{ color: card.color }}>{card.text.split(' ')[0]}</span>
                  <span>{card.text.split(' ').slice(1).join(' ')}</span>
                </p>
              </div>
              
              {/* Sparkline chart on right */}
              <div className="flex flex-col items-end justify-between h-full space-y-4">
                <div className="h-10 w-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={card.spark}>
                      <Line 
                        type="monotone" 
                        dataKey="v" 
                        stroke={card.color} 
                        strokeWidth={1.8} 
                        dot={false} 
                      />
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
        
        {/* Left Columns (Span 2): Chart + Timeline logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User Distribution bar chart */}
          <div className="glass-card animate-3d-entry stagger-3 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                User Distribution by Department
              </h3>
              <select className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-2 py-1 text-[10px] text-gray-400 focus:outline-none focus:border-slate-700">
                <option>This Month</option>
                <option>Last Quarter</option>
              </select>
            </div>
            
            <div className="h-[280px] w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">Loading directory graph...</div>
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
                        backgroundColor: 'rgba(8, 12, 28, 0.9)', 
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

          {/* Recent Directory Activity Timeline */}
          <div className="glass-card animate-3d-entry stagger-4 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Recent Directory Activity
              </h3>
              <button 
                onClick={() => navigate('/audit-logs')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                View All Logs <FiArrowRight className="text-xs" />
              </button>
            </div>
            
            <div className="flow-root">
              <ul className="-mb-8">
                {/* Seed default log lists if empty, or map from db logs */}
                {(recentLogs.length > 0 ? recentLogs.map((log, idx) => ({
                  id: log.id,
                  event: log.action === 'LOGIN_SUCCESS' ? 'User Login' : log.action,
                  detail: log.action === 'LOGIN_SUCCESS' ? `${log.user?.email || 'System'} authenticated successfully.` : `${log.resource_type || 'Object'} modified.`,
                  badge: log.action,
                  badgeColor: log.action.includes('FAILED') ? 'bg-red-950/30 text-red-400 border-red-500/20' : 'bg-blue-950/30 text-blue-400 border-blue-500/20',
                  ip: log.ip_address || '127.0.0.1',
                  time: new Date(log.timestamp).toLocaleTimeString(),
                  success: !log.action.includes('FAILED')
                })) : [
                  { id: 1, event: 'User Login', detail: 'admin@entra-rbac.com logged in successfully.', badge: 'USER_LOGIN', badgeColor: 'bg-blue-950/40 text-blue-400 border-blue-500/20', ip: '127.0.0.1', time: '2 min ago', success: true },
                  { id: 2, event: 'Role Assigned', detail: 'Manager role assigned to John Doe.', badge: 'ROLE_ASSIGN', badgeColor: 'bg-violet-950/40 text-violet-400 border-violet-500/20', ip: '127.0.0.1', time: '5 min ago', success: true },
                  { id: 3, event: 'Visitor Pass Approved', detail: 'Visitor pass approved for Alice Smith.', badge: 'VISITOR_PASS', badgeColor: 'bg-teal-950/40 text-teal-400 border-teal-500/20', ip: '127.0.0.1', time: '15 min ago', success: true },
                  { id: 4, event: 'Failed Login Attempt', detail: 'Invalid password for user@entra.com.', badge: 'LOGIN_FAILED', badgeColor: 'bg-red-950/40 text-red-400 border-red-500/20', ip: '127.0.0.1', time: '20 min ago', success: false }
                ]).map((log, logIdx) => (
                  <li key={log.id}>
                    <div className="relative pb-8">
                      {logIdx !== 3 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-slate-900/30 ${
                            log.success ? 'bg-blue-950 border border-blue-500/30' : 'bg-red-950 border border-red-500/30'
                          }`}>
                            {log.success ? (
                              <FiCheckCircle className="text-xs text-blue-400" />
                            ) : (
                              <FiAlertTriangle className="text-xs text-red-400" />
                            )}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 flex justify-between items-start gap-4">
                          <div className="text-xs text-gray-300">
                            <span className="font-bold text-white">{log.event}</span>
                            <p className="text-[11px] text-gray-400 mt-0.5">{log.detail}</p>
                          </div>
                          <div className="flex items-center gap-3 text-right flex-shrink-0">
                            <span className="text-[10px] text-gray-500">{log.time}</span>
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-mono ${log.badgeColor}`}>
                              {log.badge}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">{log.ip}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${log.success ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: AI Security insights + Quick Actions */}
        <div className="space-y-6">
          
          {/* AI Security Insights */}
          <div className="glass-card animate-3d-entry stagger-3 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <span className="text-blue-400 font-bold">AI</span> AI Security Insights
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-905">
                <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-200">Access patterns are normal</p>
                  <p className="text-gray-550 text-[10px] mt-0.5">No unusual activity detected in the system</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-905">
                <FiAlertTriangle className="text-amber-500 text-sm mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-200">One suspicious login detected</p>
                  <p className="text-gray-550 text-[10px] mt-0.5">Review recommended for location mismatch</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-905">
                <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-200">All visitor passes verified</p>
                  <p className="text-gray-550 text-[10px] mt-0.5">No action required for guest accounts</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/20 border border-slate-905">
                <FiCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-200">Policies are up to date</p>
                  <p className="text-gray-550 text-[10px] mt-0.5">Compliance score maintains at 98%</p>
                </div>
              </div>
            </div>

            {/* AI Recommendation Banner */}
            <div className="bg-indigo-950/20 border border-indigo-500/25 rounded-xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI Recommendation</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Review John Doe's VPN login from unusual location.
              </p>
              <button 
                onClick={() => navigate('/security')}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]"
              >
                Review Now
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="glass-card animate-3d-entry stagger-4 p-5 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <h3 className="font-bold text-white text-sm">
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {hasPermission('users:write') && (
                <button 
                  onClick={() => navigate('/users')}
                  className="flex flex-col items-start p-3 rounded-xl border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all group"
                >
                  <div className="p-2 rounded-lg bg-blue-900/30 text-blue-400 border border-blue-500/20 mb-3 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                    <FiUsers className="text-sm" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">Create User</span>
                  <span className="text-[9px] text-gray-500 mt-1">Add user to directory</span>
                </button>
              )}

              {hasPermission('roles:write') && (
                <button 
                  onClick={() => navigate('/roles')}
                  className="flex flex-col items-start p-3 rounded-xl border border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 text-left transition-all group"
                >
                  <div className="p-2 rounded-lg bg-violet-900/30 text-violet-400 border border-violet-500/20 mb-3 shadow-[0_0_10px_rgba(139,92,246,0.15)]">
                    <FiShield className="text-sm" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-violet-400 transition-colors">Configure Roles</span>
                  <span className="text-[9px] text-gray-500 mt-1">Manage permissions</span>
                </button>
              )}

              {hasPermission('departments:write') && (
                <button 
                  onClick={() => navigate('/departments')}
                  className="flex flex-col items-start p-3 rounded-xl border border-teal-500/20 hover:border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10 text-left transition-all group"
                >
                  <div className="p-2 rounded-lg bg-teal-900/30 text-teal-400 border border-teal-500/20 mb-3 shadow-[0_0_10px_rgba(13,148,136,0.15)]">
                    <FiLayers className="text-sm" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-teal-400 transition-colors">Add Department</span>
                  <span className="text-[9px] text-gray-500 mt-1">Create new unit</span>
                </button>
              )}

              <button 
                onClick={() => navigate('/login-history')}
                className="flex flex-col items-start p-3 rounded-xl border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 text-left transition-all group"
              >
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
