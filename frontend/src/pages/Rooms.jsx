import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiCheck,
  FiUsers, FiShield, FiAlertTriangle, FiSearch,
  FiMapPin, FiLayers, FiKey, FiLock, FiUnlock, FiChevronDown
} from 'react-icons/fi';
import { BsDoorOpen } from 'react-icons/bs';

// ─────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────
const ROOM_TYPE_CONFIG = {
  'Lab':            { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',        icon: '🔬' },
  'Office':         { color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300',     icon: '🏢' },
  'Library':        { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',    icon: '📚' },
  'Conference Room':{ color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',icon: '📋' },
  'Server Room':    { color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300',             icon: '🖥️' },
  'Cafeteria':      { color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',icon: '☕' },
  'Reception':      { color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300',        icon: '🤝' },
  'Storage':        { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',            icon: '📦' },
  'Other':          { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',        icon: '🚪' },
};

const ACCESS_LEVEL_CONFIG = {
  'Full Access':      { color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300',   icon: <FiUnlock /> },
  'Read Only':        { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',        icon: <FiKey /> },
  'Time Restricted':  { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',   icon: <FiLock /> },
  'Escorted Only':    { color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300',             icon: <FiShield /> },
};

const ROOM_TYPES   = ['Lab','Office','Library','Conference Room','Server Room','Cafeteria','Reception','Storage','Other'];
const ACCESS_LEVELS = ['Full Access','Read Only','Time Restricted','Escorted Only'];

const Badge = ({ label, config }) => {
  const cfg = config?.[label] || { color: 'bg-gray-100 text-gray-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
      {typeof cfg.icon === 'string' ? cfg.icon : cfg.icon}
      {label}
    </span>
  );
};

// ─────────────────────────────────────────
// Room Form Modal
// ─────────────────────────────────────────
const RoomModal = ({ room, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: room?.name || '',
    room_type: room?.room_type || 'Office',
    building: room?.building || '',
    floor: room?.floor || '',
    location: room?.location || '',
    capacity: room?.capacity || '',
    description: room?.description || '',
    requires_escort: room?.requires_escort || false,
    is_active: room?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Room name is required.'); return; }
    setLoading(true);
    try {
      const payload = { ...form, capacity: form.capacity ? parseInt(form.capacity) : null };
      if (room) {
        await api.put(`/rooms/${room.id}`, payload);
      } else {
        await api.post('/rooms/', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <BsDoorOpen className="text-microsoft-blue" />
            {room ? 'Edit Room' : 'Add New Room'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg">
              <FiAlertTriangle /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Room Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                placeholder="e.g. Engineering Lab A"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Room Type</label>
              <select
                value={form.room_type}
                onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
              >
                {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Capacity</label>
              <input
                type="number" min="1"
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                placeholder="Max occupancy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Building</label>
              <input
                value={form.building}
                onChange={e => setForm(f => ({ ...f, building: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                placeholder="Block / Tower name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Floor</label>
              <input
                value={form.floor}
                onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                placeholder="e.g. Ground Floor"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Location Details</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
                placeholder="e.g. Block A, East Wing"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue resize-none"
                placeholder="Purpose, equipment, restrictions..."
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.requires_escort}
                onChange={e => setForm(f => ({ ...f, requires_escort: e.target.checked }))}
                className="w-4 h-4 rounded text-microsoft-blue focus:ring-microsoft-blue"
              />
              Requires Escort
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded text-microsoft-blue focus:ring-microsoft-blue"
              />
              Active
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-microsoft-borderLight dark:border-microsoft-borderDark text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Grant Access Modal
// ─────────────────────────────────────────
const GrantAccessModal = ({ room, users, roles, onClose, onSave }) => {
  const [form, setForm] = useState({
    grantType: 'user',
    user_id: '',
    role_id: '',
    access_level: 'Full Access',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.grantType === 'user' && !form.user_id) { setError('Please select a user.'); return; }
    if (form.grantType === 'role' && !form.role_id) { setError('Please select a role.'); return; }
    setLoading(true);
    try {
      const payload = {
        room_id: room.id,
        access_level: form.access_level,
        notes: form.notes || null,
        user_id: form.grantType === 'user' ? parseInt(form.user_id) : null,
        role_id: form.grantType === 'role' ? parseInt(form.role_id) : null,
      };
      await api.post('/rooms/access/grant', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to grant access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-microsoft-borderLight dark:border-microsoft-borderDark">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiKey className="text-microsoft-blue" />
            Grant Room Access
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-microsoft-blueLight dark:bg-blue-950/20 rounded-lg text-xs text-microsoft-blue dark:text-blue-400 font-medium flex items-center gap-2">
            <BsDoorOpen /> Granting access to: <strong>{room.name}</strong>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg">
              <FiAlertTriangle /> {error}
            </div>
          )}
          {/* Grant Type Toggle */}
          <div className="flex rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark overflow-hidden">
            {['user','role'].map(t => (
              <button
                key={t} type="button"
                onClick={() => setForm(f => ({ ...f, grantType: t, user_id: '', role_id: '' }))}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  form.grantType === t
                    ? 'bg-microsoft-blue text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t === 'user' ? '👤 Specific User' : '🛡️ By Role'}
              </button>
            ))}
          </div>

          {form.grantType === 'user' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Select User</label>
              <select
                value={form.user_id}
                onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
              >
                <option value="">-- Choose a user --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Select Role</label>
              <select
                value={form.role_id}
                onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
              >
                <option value="">-- Choose a role --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Access Level</label>
            <select
              value={form.access_level}
              onChange={e => setForm(f => ({ ...f, access_level: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
            >
              {ACCESS_LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
              placeholder="Reason, project, validity..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Granting...' : 'Grant Access'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-microsoft-borderLight dark:border-microsoft-borderDark text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Room Access Panel (Drawer)
// ─────────────────────────────────────────
const RoomAccessPanel = ({ room, hasWriteAccess, onClose, onRefresh }) => {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const fetchGrants = useCallback(async () => {
    setLoading(true);
    try {
      const [grantsRes, usersRes, rolesRes] = await Promise.all([
        api.get(`/rooms/${room.id}/access`),
        api.get('/users/'),
        api.get('/roles/'),
      ]);
      setGrants(grantsRes.data);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  const handleRevoke = async (grantId) => {
    if (!window.confirm('Revoke this access grant?')) return;
    try {
      await api.delete(`/rooms/access/${grantId}`);
      fetchGrants();
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to revoke access.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-microsoft-cardDark h-full flex flex-col shadow-2xl border-l border-microsoft-borderLight dark:border-microsoft-borderDark overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-microsoft-borderLight dark:border-microsoft-borderDark bg-gradient-to-r from-microsoft-blue to-blue-700 text-white">
          <div className="flex items-start gap-3">
            <span className="text-3xl mt-0.5">{ROOM_TYPE_CONFIG[room.room_type]?.icon || '🚪'}</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">{room.name}</h3>
              <p className="text-xs text-blue-100 mt-0.5">{room.building} · {room.floor}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Room Info Strip */}
        <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-microsoft-borderLight dark:border-microsoft-borderDark text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><FiMapPin /> {room.location || 'N/A'}</span>
          <span className="flex items-center gap-1"><FiUsers /> Cap: {room.capacity ?? 'N/A'}</span>
          {room.requires_escort && (
            <span className="flex items-center gap-1 text-red-500"><FiLock /> Escort Required</span>
          )}
        </div>

        {/* Actions Bar */}
        {hasWriteAccess && (
          <div className="px-6 py-3 border-b border-microsoft-borderLight dark:border-microsoft-borderDark">
            <button
              onClick={() => setShowGrantModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <FiPlus /> Grant Access
            </button>
          </div>
        )}

        {/* Grants List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading grants...</div>
          ) : grants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
              <FiKey className="text-3xl opacity-30" />
              <p className="text-sm">No access grants configured</p>
            </div>
          ) : (
            <ul className="divide-y divide-microsoft-borderLight dark:divide-microsoft-borderDark">
              {grants.map(grant => (
                <li key={grant.id} className={`px-6 py-4 flex items-center justify-between gap-3 ${!grant.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold flex-shrink-0 ${
                      grant.role ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                    }`}>
                      {grant.role ? <FiShield /> : <FiUsers />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {grant.role
                          ? `Role: ${grant.role.name}`
                          : grant.user
                            ? `${grant.user.first_name} ${grant.user.last_name}`
                            : 'Unknown'}
                      </p>
                      {grant.user && (
                        <p className="text-[10px] text-gray-400 truncate">{grant.user.email}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Badge label={grant.access_level} config={ACCESS_LEVEL_CONFIG} />
                        {!grant.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800">Revoked</span>
                        )}
                        {grant.notes && (
                          <span className="text-[10px] text-gray-400 italic truncate max-w-[120px]">{grant.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasWriteAccess && grant.is_active && (
                    <button
                      onClick={() => handleRevoke(grant.id)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      title="Revoke Access"
                    >
                      <FiX />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showGrantModal && (
        <GrantAccessModal
          room={room}
          users={users}
          roles={roles}
          onClose={() => setShowGrantModal(false)}
          onSave={() => { setShowGrantModal(false); fetchGrants(); onRefresh(); }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Main Rooms Page
// ─────────────────────────────────────────
const Rooms = () => {
  const { hasPermission } = useAuth();
  const canWrite  = hasPermission('rooms:write');
  const canDelete = hasPermission('rooms:delete');

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('room_type', filterType);
      const res = await api.get(`/rooms/?${params.toString()}`);
      setRooms(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleDelete = async (room) => {
    try {
      await api.delete(`/rooms/${room.id}`);
      setConfirmDelete(null);
      fetchRooms();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete room.');
    }
  };

  // Summary stats
  const totalActive   = rooms.filter(r => r.is_active).length;
  const restricted    = rooms.filter(r => r.requires_escort).length;
  const totalAccess   = rooms.reduce((s, r) => s + (r.access_count || 0), 0);
  const uniqueTypes   = [...new Set(rooms.map(r => r.room_type))].length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <BsDoorOpen className="text-microsoft-blue" /> Room Access Control
          </h1>
          <p className="text-sm text-microsoft-subtextLight dark:text-microsoft-subtextDark mt-1">
            Manage physical space access — labs, offices, libraries, server rooms &amp; more
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue hover:bg-microsoft-blueHover text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:shadow-md"
          >
            <FiPlus /> Add Room
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Rooms',    value: rooms.length,  color: 'text-microsoft-blue', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Active',         value: totalActive,   color: 'text-green-600',       bg: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Access Grants',  value: totalAccess,   color: 'text-purple-600',      bg: 'bg-purple-50 dark:bg-purple-950/20' },
          { label: 'Restricted',     value: restricted,    color: 'text-red-600',         bg: 'bg-red-50 dark:bg-red-950/20' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-transparent`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{loading ? '—' : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search rooms, buildings, locations..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-microsoft-cardDark text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg border border-microsoft-borderLight dark:border-microsoft-borderDark bg-white dark:bg-microsoft-cardDark text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
        >
          <option value="">All Types</option>
          {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
          <BsDoorOpen className="text-5xl opacity-20" />
          <p className="text-sm">No rooms found. {canWrite && 'Click "Add Room" to get started.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const typeCfg = ROOM_TYPE_CONFIG[room.room_type] || ROOM_TYPE_CONFIG['Other'];
            return (
              <div
                key={room.id}
                className={`group bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden ${!room.is_active ? 'opacity-60' : ''}`}
              >
                {/* Card Top Accent */}
                <div className="h-1.5 bg-gradient-to-r from-microsoft-blue to-blue-400" />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5">{typeCfg.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight">{room.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge label={room.room_type} config={ROOM_TYPE_CONFIG} />
                          {room.requires_escort && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-semibold">
                              <FiLock className="text-[9px]" /> Escort
                            </span>
                          )}
                          {!room.is_active && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location info */}
                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {room.building && (
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-[11px] flex-shrink-0" />
                        <span className="truncate">{room.building}{room.floor ? ` · ${room.floor}` : ''}</span>
                      </div>
                    )}
                    {room.location && (
                      <div className="flex items-center gap-2">
                        <FiMapPin className="text-[11px] flex-shrink-0" />
                        <span className="truncate">{room.location}</span>
                      </div>
                    )}
                    {room.description && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 mt-1">{room.description}</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-microsoft-borderLight dark:border-microsoft-borderDark">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <FiKey className="text-microsoft-blue" />
                      <span><strong className="text-gray-700 dark:text-gray-300">{room.access_count}</strong> grants</span>
                      {room.capacity && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
                          <FiUsers className="text-gray-400" />
                          <span>{room.capacity} cap</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="p-1.5 text-microsoft-blue hover:bg-microsoft-blueLight dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                        title="View Access"
                      >
                        <FiKey className="text-sm" />
                      </button>
                      {canWrite && (
                        <button
                          onClick={() => setEditRoom(room)}
                          className="p-1.5 text-gray-500 hover:text-microsoft-blue hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit Room"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(room)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                          title="Delete Room"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <RoomModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => { setShowCreateModal(false); fetchRooms(); }}
        />
      )}
      {editRoom && (
        <RoomModal
          room={editRoom}
          onClose={() => setEditRoom(null)}
          onSave={() => { setEditRoom(null); fetchRooms(); }}
        />
      )}
      {selectedRoom && (
        <RoomAccessPanel
          room={selectedRoom}
          hasWriteAccess={canWrite}
          onClose={() => setSelectedRoom(null)}
          onRefresh={fetchRooms}
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-microsoft-cardDark rounded-xl border border-microsoft-borderLight dark:border-microsoft-borderDark shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600">
                <FiTrash2 />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Delete Room?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This will remove <strong>{confirmDelete.name}</strong> and all its access grants.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-microsoft-borderLight dark:border-microsoft-borderDark text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
