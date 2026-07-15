import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { FiUser, FiMail, FiLayers, FiShield, FiKey, FiAlertCircle, FiCheckCircle, FiClock, FiGlobe } from 'react-icons/fi';

const Profile = () => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessions, setSessions] = useState([]);
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch active sessions of the user
  // Let's create a small local fetch routine.
  // We can query login history of this user or sessions. In a production app, the backend yields them.
  // Since we have a backend that stores user_sessions, we can filter them or fetch the login history for this user.
  // Let's query `/audit/login-history` and filter by user email.
  useEffect(() => {
    const fetchMyHistory = async () => {
      try {
        const resp = await api.get('/audit/login-history');
        const myLogs = resp.data.filter(log => log.email === user.email);
        setSessions(myLogs.slice(0, 5)); // show last 5 login history logs
      } catch (err) {
        console.error('Could not fetch personal sign-in history logs:', err);
      }
    };
    if (user) {
      fetchMyHistory();
    }
  }, [user]);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/reset-password', {
        email: user.email,
        new_password: newPassword
      });
      setSuccess('Your profile password has been successfully updated.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-400">Loading profile card...</div>;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-sans">Account Center</h2>
        <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-0.5">
          View your corporate credentials, current permissions, and active directory sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Permissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Identity Details */}
          <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-microsoft-blue/10 text-microsoft-blue text-2xl font-bold border-2 border-microsoft-blue/20">
                {user.first_name ? user.first_name[0] : 'U'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {user.first_name} {user.last_name}
                </h3>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 mt-1 inline-block">
                  {user.role?.name || 'Visitor'}
                </span>
              </div>
            </div>

            <div className="border-t border-microsoft-borderLight dark:border-microsoft-borderDark my-4 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <FiMail className="text-gray-400 text-lg" />
                <div>
                  <p className="text-[10px] text-gray-400">Email Address</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiLayers className="text-gray-400 text-lg" />
                <div>
                  <p className="text-[10px] text-gray-400">Department</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{user.department?.name || 'None'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiShield className="text-gray-400 text-lg" />
                <div>
                  <p className="text-[10px] text-gray-400">Account Status</p>
                  <p className="font-medium text-green-600 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 status-active-dot"></span> Active
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiClock className="text-gray-400 text-lg" />
                <div>
                  <p className="text-[10px] text-gray-400">User Registered At</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Directory Access privileges */}
          <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
              <FiKey /> Granted Access Privileges
            </h3>
            
            {user.role?.name === 'Administrator' ? (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/50 rounded-lg text-xs leading-relaxed">
                As a member of the **Global Administrator** directory role, you possess full administrative permissions. Access checks are bypassed globally.
              </div>
            ) : !user.role?.permissions || user.role.permissions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No operational permissions granted. Default "Visitor" access restriction applied.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {user.role.permissions.map((perm) => (
                  <div key={perm.id} className="p-3 border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg hover:border-microsoft-blue dark:hover:border-microsoft-blue transition-all">
                    <span className="font-mono text-xs font-semibold text-microsoft-blue">{perm.name}</span>
                    <p className="text-[10px] text-gray-400 mt-1">{perm.description || 'Access capability key'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Panel Side: Password updates and Login Logs */}
        <div className="space-y-6">
          {/* Update Password */}
          <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              Update Credential Password
            </h3>
            
            <form onSubmit={handlePasswordReset} className="space-y-3.5">
              {error && (
                <div className="flex items-start gap-1.5 p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs border border-red-200 rounded">
                  <FiAlertCircle className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-1.5 p-2 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-xs border border-green-200 rounded">
                  <FiCheckCircle className="mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-microsoft-bgDark border border-microsoft-borderLight dark:border-microsoft-borderDark rounded-lg focus:outline-none dark:text-gray-200"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Recent Sign-in logs */}
          <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              Your Recent Sign-ins
            </h3>
            
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No sign-in history trail loaded.</p>
              ) : (
                sessions.map((log) => (
                  <div key={log.id} className="flex items-start justify-between text-xs border-b border-microsoft-borderLight dark:border-microsoft-borderDark pb-2.5 last:border-b-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <FiGlobe /> {log.ip_address || 'Internal IP'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      log.status === 'Success'
                        ? 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
