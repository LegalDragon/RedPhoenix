import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName((user as any).firstName || '');
      setLastName((user as any).lastName || '');
    }
  }, [user]);

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.put<{ message: string }>('/auth/profile', {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      });
      setMessage({ type: 'success', text: t('profile.updateSuccess') });
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setMessage({ type: 'error', text: t('profile.updateFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">{t('profile.title')}</h1>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('profile.phoneLabel')}</label>
            <div className="px-4 py-3 bg-gray-700/50 rounded-lg text-gray-300 text-sm">
              {user?.phone ? formatPhone(user.phone) : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('profile.phoneReadonly')}</p>
          </div>

          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-400 mb-1">
              {t('profile.firstName')}
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('profile.firstNamePlaceholder')}
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-400 mb-1">
              {t('profile.lastName')}
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('profile.lastNamePlaceholder')}
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('profile.roleLabel')}</label>
            <div className="px-4 py-3 bg-gray-700/50 rounded-lg text-gray-300 text-sm">
              {user?.role || '—'}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-red-900/50 text-red-300 border border-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
        </form>
      </div>
    </div>
  );
}
