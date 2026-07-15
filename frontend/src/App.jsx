import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Permissions from './pages/Permissions';
import AuditLogs from './pages/AuditLogs';
import LoginHistory from './pages/LoginHistory';
import Profile from './pages/Profile';
import Rooms from './pages/Rooms';
import AICopilot from './pages/AICopilot';
import AccessRequests from './pages/AccessRequests';
import Visitors from './pages/Visitors';
import Security from './pages/Security';
import Policies from './pages/Policies';
import AssignRole from './pages/AssignRole';
import AssignPermission from './pages/AssignPermission';
import Settings from './pages/Settings';

// Protected layout component
const DashboardLayout = ({ isCollapsed, toggleCollapse }) => {
  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Floating 3D Neon Orbs in Background */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[110px] pointer-events-none glow-orb-1"></div>
      <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none glow-orb-2"></div>
      
      <Sidebar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      
      {/* Main Content Area */}
      <div 
        className="pt-20 px-6 pb-6 min-h-screen transition-all duration-300"
        style={{ paddingLeft: isCollapsed ? '6.5rem' : '17.5rem' }}
      >
        <Navbar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
        <main className="max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Access Denied page component
const AccessDenied = () => {
  return (
    <div className="bg-white dark:bg-microsoft-cardDark p-8 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm text-center max-w-lg mx-auto mt-12 space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Directory Access Blocked</h3>
      <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark leading-relaxed">
        Your user account holds insufficient privileges to review this resource. Please contact your directory Administrator to request role modification.
      </p>
      <button 
        onClick={() => window.location.href = '/dashboard'}
        className="px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-semibold rounded-lg shadow-sm"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

// Routing Guards
const ProtectedRoute = ({ requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  return <Outlet />;
};

const App = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <Routes>
      {/* Public auth route */}
      <Route path="/login" element={<Login />} />

      {/* Protected dashboard system routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout isCollapsed={isSidebarCollapsed} toggleCollapse={toggleSidebar} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* AI Copilot & Access Request & Visitors */}
          <Route path="/copilot" element={<AICopilot />} />
          <Route path="/access-requests" element={<AccessRequests />} />
          <Route path="/visitors" element={<Visitors />} />

          {/* Module-restricted routes */}
          <Route element={<ProtectedRoute requiredPermission="departments:read" />}>
            <Route path="/departments" element={<Departments />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="users:read" />}>
            <Route path="/users" element={<Users />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="roles:read" />}>
            <Route path="/roles" element={<Roles />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="permissions:read" />}>
            <Route path="/permissions" element={<Permissions />} />
          </Route>
          
          <Route element={<ProtectedRoute requiredPermission="users:write" />}>
            <Route path="/assign-role" element={<AssignRole />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="roles:write" />}>
            <Route path="/assign-permission" element={<AssignPermission />} />
          </Route>
          
          <Route element={<ProtectedRoute requiredPermission="audit:read" />}>
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/security" element={<Security />} />
            <Route path="/policies" element={<Policies />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="login_history:read" />}>
            <Route path="/login-history" element={<LoginHistory />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="rooms:read" />}>
            <Route path="/rooms" element={<Rooms />} />
          </Route>

          <Route path="/settings" element={<Settings />} />

          {/* Standard Profile access */}
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Catch-all redirects */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
