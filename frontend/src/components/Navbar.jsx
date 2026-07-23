import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiMenu, FiBell, FiChevronDown, FiUser, FiSettings, FiLogOut, FiSearch } from 'react-icons/fi';

const Navbar = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Always enforce dark mode — this app is dark-theme only
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Compute breadcrumb/title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Identity Dashboard';
    if (path === '/departments') return 'Departments Registry';
    if (path === '/users') return 'Active Users Directory';
    if (path === '/roles') return 'Enterprise Role Definitions';
    if (path === '/permissions') return 'System Access Privileges';
    if (path === '/audit-logs') return 'Compliance Audit Logs';
    if (path === '/login-history') return 'Sign-in History Trails';
    if (path === '/profile') return 'Account Profile Settings';
    return 'Entra Control Panel';
  };

  return (
    <header className="fixed top-0 right-0 z-10 flex items-center justify-between h-16 bg-slate-950/20 border-b border-slate-800/40 backdrop-blur-md transition-all duration-300" style={{ left: isCollapsed ? '5rem' : '16rem' }}>
      <div className="flex items-center gap-4 px-6 flex-1 max-w-xl">
        <button
          onClick={toggleCollapse}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <FiMenu className="text-xl" />
        </button>
        
        {/* Search Bar */}
        <div className="relative w-full hidden md:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <FiSearch className="text-sm" />
          </span>
          <input
            type="text"
            placeholder="Search users, roles, permissions, logs..."
            className="w-full pl-9 pr-12 py-1.5 border border-slate-800/60 bg-slate-950/50 text-gray-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-gray-500"
          />
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 border border-slate-700/60">⌘K</kbd>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 px-6">

        {/* Notifications Mock */}
        <button
          title="Notifications"
          className="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <FiBell className="text-xl" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]"></span>
        </button>

        {/* AI Copilot shortcut button */}
        <button
          onClick={() => window.location.href = '/copilot'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-[0_0_12px_rgba(37,99,235,0.45)]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Copilot
        </button>

        {/* User Profile Info Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 p-1 hover:bg-white/5 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-950 text-blue-400 border border-blue-500/30 font-bold text-xs uppercase shadow-inner">
                {user.first_name ? user.first_name[0] : 'U'}{user.last_name ? user.last_name[0] : 'A'}
              </div>
              <div className="hidden md:flex flex-col select-none">
                <span className="text-xs font-semibold text-gray-200">
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-[9px] text-gray-400 mt-0.5">
                  {user.role?.name || 'Visitor'}
                </span>
              </div>
              <FiChevronDown className={`text-gray-400 text-xs transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <>
                {/* Backdrop handler to close dropdown */}
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-56 glass-panel rounded-lg shadow-2xl py-1 z-20 animate-fade-in-down">
                  <div className="px-4 py-3 border-b border-slate-800/40">
                    <p className="text-[10px] text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-200 truncate">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={() => { setShowDropdown(false); window.location.href = '/profile'; }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <FiUser /> My Profile
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); window.location.href = '/profile'; }} 
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <FiSettings /> Settings
                  </button>
                  
                  <div className="border-t border-slate-800/40 my-1"></div>
                  
                  <button
                    onClick={() => { setShowDropdown(false); logout(); }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-950/20 transition-colors"
                  >
                    <FiLogOut /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
