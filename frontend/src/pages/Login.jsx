import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { VscShield } from 'react-icons/vsc';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import api from '../services/api';

const Login = () => {
  const { login, error, resetError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot password states
  const [view, setView] = useState('login'); // 'login', 'forgot', 'reset'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetPassEmail, setResetPassEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [localError, setLocalError] = useState('');

  // Auto-clear any stale/expired tokens when Login page loads
  useEffect(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
    resetError();
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    await login(email, password, rememberMe);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    if (!recoveryEmail) {
      setLocalError('Please enter your email.');
      return;
    }
    try {
      const resp = await api.post('/auth/forgot-password', { email: recoveryEmail });
      setSuccessMsg(resp.data.message || 'Reset link sent successfully.');
      setTimeout(() => {
        setView('reset');
        setResetPassEmail(recoveryEmail);
        setLocalError('');
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      setLocalError(err.response?.data?.detail || 'Failed to request password reset.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    if (!resetPassEmail || !newPassword) {
      setLocalError('Please fill all fields.');
      return;
    }
    try {
      const resp = await api.post('/auth/reset-password', {
        email: resetPassEmail,
        new_password: newPassword
      });
      setSuccessMsg(resp.data.message || 'Password successfully updated.');
      setTimeout(() => {
        setView('login');
        setPassword('');
        setLocalError('');
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      setLocalError(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 transition-colors">
      <div className="w-full max-w-[440px] glass-card p-10 rounded-2xl border border-slate-700/40 shadow-[0_0_40px_rgba(0,120,212,0.15)] glow-blue transition-all">
        {/* BDL Entra / App Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-9 h-9 rounded bg-[#0078d4] text-white shadow-[0_0_15px_rgba(0,120,212,0.4)]">
            <VscShield className="text-2xl" />
          </div>
          <span className="font-semibold text-lg text-white">
            BDL Entra ID
          </span>
        </div>

        {/* View Switchers */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">Sign in</h2>
              <p className="text-xs text-gray-400 mt-1">to access the Governance Dashboard</p>
            </div>

            {/* Error notifications */}
            {(error || localError) && (
              <div className="flex items-start gap-2 p-3 text-xs bg-red-950/30 text-red-400 border border-red-500/20 rounded-lg">
                <FiAlertCircle className="text-sm flex-shrink-0 mt-0.5" />
                <span>{localError || error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiMail />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); resetError(); setLocalError(''); }}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/45 border border-slate-800 text-gray-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiLock />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetError(); setLocalError(''); }}
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/45 border border-slate-800 text-gray-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950/40 text-blue-500 focus:ring-blue-500/30"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => { setView('forgot'); setLocalError(''); resetError(); }}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign in'}
            </button>

            <div className="text-center text-[10px] text-gray-500 mt-8">
              Secured under BDL Entra Identity Governance Guidelines.
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">Recover Password</h2>
              <p className="text-xs text-gray-400 mt-1">We will send reset credentials to your directory mail</p>
            </div>

            {/* Notifications */}
            {localError && (
              <div className="flex items-start gap-2 p-3 text-xs bg-red-950/30 text-red-400 border border-red-500/20 rounded-lg">
                <FiAlertCircle className="text-sm flex-shrink-0 mt-0.5" />
                <span>{localError}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-xs bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 rounded-lg">
                {successMsg}
              </div>
            )}

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <FiMail />
              </span>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => { setRecoveryEmail(e.target.value); setLocalError(''); }}
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/45 border border-slate-800 text-gray-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-colors"
              >
                Send Recovery Request
              </button>
              <button
                type="button"
                onClick={() => { setView('login'); setLocalError(''); }}
                className="w-full py-2 border border-slate-800 text-gray-300 font-semibold text-sm rounded-lg hover:bg-white/5 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">Create New Password</h2>
              <p className="text-xs text-gray-400 mt-1">Enter your details below to update your credential</p>
            </div>

            {/* Notifications */}
            {localError && (
              <div className="flex items-start gap-2 p-3 text-xs bg-red-950/30 text-red-400 border border-red-500/20 rounded-lg">
                <FiAlertCircle className="text-sm flex-shrink-0 mt-0.5" />
                <span>{localError}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-xs bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 rounded-lg">
                {successMsg}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiMail />
                </span>
                <input
                  type="email"
                  value={resetPassEmail}
                  onChange={(e) => { setResetPassEmail(e.target.value); setLocalError(''); }}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/45 border border-slate-800 text-gray-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiLock />
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setLocalError(''); }}
                  placeholder="New Password"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/45 border border-slate-800 text-gray-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-colors"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
