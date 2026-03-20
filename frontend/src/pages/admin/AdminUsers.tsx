import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, User, Search, Download, CheckCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface UserWithStats {
  id: number;
  phone: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  mealCount: number;
  lastMealAt: string | null;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [smsUserId, setSmsUserId] = useState<number | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState('');

  const loadUsers = () => {
    api.get<UserWithStats[]>('/admin/users')
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        displayName: editingUser.displayName,
        role: editingUser.role,
        isActive: editingUser.isActive,
      });
      loadUsers();
      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!smsUserId || !smsMessage.trim()) return;
    setSendingSms(true);
    setSmsSuccess('');
    try {
      const res = await api.post<{ message: string }>(`/admin/test-sms/${smsUserId}`, {
        message: smsMessage
      });
      setSmsSuccess(res.message);
      setSmsMessage('');
      setSmsUserId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingSms(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return u.phone.includes(q) || (u.displayName?.toLowerCase().includes(q) ?? false);
  });

  const exportToExcel = () => {
    const data = filteredUsers.map(u => ({
      Name: u.displayName || '',
      Phone: formatPhone(u.phone),
      Role: u.role,
      Active: u.isActive ? 'Yes' : 'No',
      'Meal Count': u.mealCount,
      'Last Meal': u.lastMealAt ? formatDate(u.lastMealAt) : '',
      Joined: formatDate(u.createdAt),
    }));

    // Build CSV
    const headers = Object.keys(data[0] || {});
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = String((row as Record<string, unknown>)[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      ),
    ];
    const csv = csvRows.join('\n');

    // Download as CSV (opens fine in Excel)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usushi-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">{t('adminUsers.loadingUsers')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">{t('adminUsers.title')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition"
          >
            <Download size={16} />
            {t('adminUsers.exportExcel')}
          </button>
          <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('adminUsers.searchPlaceholder')}
            className="pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sushi-500"
          />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{t('adminUsers.editUser')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('adminUsers.phoneLabel')}</label>
                <p className="text-white">{formatPhone(editingUser.phone)}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('adminUsers.displayName')}</label>
                <input
                  value={editingUser.displayName || ''}
                  onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sushi-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('adminUsers.roleLabel')}</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sushi-500"
                >
                  <option value="User">{t('common.user')}</option>
                  <option value="Admin">{t('nav.admin')}</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingUser.isActive}
                  onChange={e => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-gray-300">{t('adminUsers.activeLabel')}</label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex-1 bg-sushi-600 hover:bg-sushi-700 text-white py-2 rounded-lg transition"
              >
                {saving ? t('profile.saving') : t('common.save')}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">{t('adminUsers.userColumn')}</th>
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">{t('adminUsers.roleColumn')}</th>
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">{t('adminUsers.mealsColumn')}</th>
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">{t('adminUsers.lastMealColumn')}</th>
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">{t('adminUsers.joinedColumn')}</th>
                <th className="text-right px-5 py-3 text-gray-400 text-sm font-medium">{t('adminUsers.actionsColumn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-750">
                  <td className="px-5 py-4">
                    <div className="flex items-center">
                      {u.role === 'Admin' ? (
                        <Shield className="text-sushi-400 mr-2 flex-shrink-0" size={16} />
                      ) : (
                        <User className="text-gray-500 mr-2 flex-shrink-0" size={16} />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{u.displayName || formatPhone(u.phone)}</p>
                          {u.isPhoneVerified ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-green-400" title={t('adminUsers.verified')}>
                              <CheckCircle size={12} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
                              <AlertCircle size={10} />
                              {t('adminUsers.unverified')}
                            </span>
                          )}
                        </div>
                        {u.displayName && <p className="text-gray-500 text-xs">{formatPhone(u.phone)}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      u.role === 'Admin' ? 'bg-sushi-900/50 text-sushi-400' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white">{u.mealCount}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">
                    {u.lastMealAt ? formatDate(u.lastMealAt) : '—'}
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!u.isPhoneVerified && (
                        <button
                          onClick={() => { setSmsUserId(u.id); setSmsMessage(''); setSmsSuccess(''); }}
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                          title={t('adminUsers.sendTestSms')}
                        >
                          <Send size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingUser({ ...u })}
                        className="text-sushi-400 hover:text-sushi-300 text-sm"
                      >
                        {t('common.edit')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-400">{t('adminUsers.noUsersFound')}</div>
        )}
      </div>

      {/* SMS Success */}
      {smsSuccess && (
        <div className="mt-4 p-3 bg-green-900/50 border border-green-500 text-green-300 rounded-lg text-sm">
          {smsSuccess}
        </div>
      )}

      {/* Test SMS Modal */}
      {smsUserId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSmsUserId(null)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Send size={20} className="text-sushi-400" />
              {t('adminUsers.sendTestSms')}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {t('adminUsers.sendingTo', {
                phone: formatPhone(users.find(u => u.id === smsUserId)?.phone || '')
              })}
            </p>
            <textarea
              value={smsMessage}
              onChange={e => setSmsMessage(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder={t('adminUsers.smsPlaceholder')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sushi-500 resize-none"
            />
            <p className="text-gray-500 text-xs mt-1">{smsMessage.length}/160</p>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleSendTestSms}
                disabled={sendingSms || !smsMessage.trim()}
                className="flex-1 bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition flex items-center justify-center"
              >
                {sendingSms ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    {t('adminUsers.sendButton')}
                  </>
                )}
              </button>
              <button
                onClick={() => setSmsUserId(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
