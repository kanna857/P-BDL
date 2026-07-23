import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  FiGrid, FiLayers, FiUsers, FiShield, FiKey, 
  FiList, FiLock, FiUser, FiSettings, FiLogOut,
  FiMessageSquare, FiCheckSquare, FiUserCheck,
  FiActivity, FiBookOpen, FiUserPlus, FiSliders
} from 'react-icons/fi';
import { VscShield } from 'react-icons/vsc';
import { BsDoorOpen } from 'react-icons/bs';

const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const { user, logout, hasPermission } = useAuth();

  const menuItems = [
    { path: '/dashboard',         label: 'Dashboard',           icon: FiGrid,          show: true },
    { path: '/copilot',           label: 'AI Access Copilot',   icon: FiMessageSquare, show: true },
    { path: '/access-requests',   label: 'Access Requests',     icon: FiCheckSquare,   show: true },
    { path: '/visitors',          label: 'Visitor Passes',      icon: FiUserCheck,     show: true },
    { path: '/security',          label: 'AI Security Logs',    icon: FiActivity,      show: hasPermission('audit:read') },
    { path: '/policies',          label: 'Policies & Audit',    icon: FiBookOpen,      show: hasPermission('audit:read') },
    { path: '/departments',       label: 'Departments',         icon: FiLayers,        show: hasPermission('departments:read') },
    { path: '/users',             label: 'Users Directory',     icon: FiUsers,         show: hasPermission('users:read') },
    { path: '/roles',             label: 'Directory Roles',     icon: FiShield,        show: hasPermission('roles:read') },
    { path: '/permissions',       label: 'Permissions List',    icon: FiKey,           show: hasPermission('permissions:read') },
    { path: '/assign-role',       label: 'Assign User Role',    icon: FiUserPlus,      show: hasPermission('users:write') },
    { path: '/assign-permission', label: 'Role Privileges',     icon: FiSliders,       show: hasPermission('roles:write') },
    { path: '/rooms',             label: 'Room Access Swipe',   icon: BsDoorOpen,      show: hasPermission('rooms:read') },
    { path: '/audit-logs',        label: 'Audit Log Trail',     icon: FiList,          show: hasPermission('audit:read') },
    { path: '/login-history',     label: 'Login History',       icon: FiLock,          show: hasPermission('login_history:read') },
    { path: '/profile',           label: 'My Profile Card',     icon: FiUser,          show: true },
  ];


  return (
    <aside className={`fixed inset-y-0 left-0 z-20 flex flex-col h-full glass-panel border-r border-slate-800/40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-microsoft-blue text-white shadow-[0_0_15px_rgba(0,120,212,0.4)]">
            <VscShield className="text-xl" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Entra Governance
            </span>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.show) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(0,120,212,0.15)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Icon className="text-lg flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>



      {/* User Footer Panel */}
      {user && (
        <div className="p-4 border-t border-slate-800/40">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-800/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-900/30 text-blue-300 border border-blue-500/20 font-semibold text-sm">
                {user.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {user.role?.name || 'Visitor'}
                </p>
              </div>
              <button 
                onClick={logout}
                title="Log Out"
                className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-colors"
              >
                <FiLogOut className="text-lg" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-900/30 text-blue-300 border border-blue-500/20 font-semibold text-sm">
                {user.first_name ? user.first_name[0] : 'U'}
              </div>
              <button 
                onClick={logout}
                title="Log Out"
                className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-colors"
              >
                <FiLogOut className="text-lg" />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
