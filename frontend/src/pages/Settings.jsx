import React from 'react';
import { FiSettings, FiCheckCircle, FiRefreshCw, FiLock, FiGlobe } from 'react-icons/fi';

const Settings = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FiSettings className="text-microsoft-blue" />
          Directory Tenant Settings
        </h2>
        <p className="text-xs text-microsoft-subtextLight dark:text-microsoft-subtextDark">
          Configure security baselines, active directory syncing, and system compliance frequencies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiLock className="text-microsoft-blue" />
            Security & Authentication Baseline
          </h3>
          
          <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span>Require Multi-Factor Authentication (MFA)</span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span>Token Session Lifetime</span>
              <span className="font-semibold">30 Minutes</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span>Password Expiration Frequency</span>
              <span className="font-semibold">90 Days</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-microsoft-cardDark p-6 rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiRefreshCw className="text-microsoft-blue animate-spin" />
            Identity Provider (IdP) Sync
          </h3>
          
          <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span>Azure Active Directory Sync</span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                <FiCheckCircle /> Connected
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span>Last Synchronized Timestamp</span>
              <span className="font-mono">July 15, 2026 09:30 AM</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span>Users Imported</span>
              <span className="font-semibold">2,450 Users</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
