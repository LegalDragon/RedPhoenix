import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface SmsBroadcastDto {
  id: number;
  adminUserId: number;
  message: string;
  recipientCount: number;
  sentAt: string;
}

export default function SmsBroadcast() {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SmsBroadcastDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    api.get<SmsBroadcastDto[]>('/admin/sms-broadcasts')
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    const target = activeOnly ? t('smsBroadcast.targetActive') : t('smsBroadcast.targetAll');
    if (!confirm(t('smsBroadcast.confirmSend', { target }))) return;

    setSending(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post<{ message: string; recipientCount: number }>('/admin/sms-broadcast', {
        message,
        activeOnly,
      });
      setResult(res.message);
      setMessage('');

      // Refresh history
      const updated = await api.get<SmsBroadcastDto[]>('/admin/sms-broadcasts');
      setHistory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('smsBroadcast.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const charCount = message.length;
  const isOverLimit = charCount > 160;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{t('smsBroadcast.title')}</h1>

      {/* Compose */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <MessageSquare size={20} className="mr-2 text-sushi-400" />
          {t('smsBroadcast.composeMessage')}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
        {result && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 text-green-300 rounded-lg text-sm">
            ✅ {result}
          </div>
        )}

        <div className="mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sushi-500 focus:border-transparent resize-none"
            placeholder={t('smsBroadcast.messagePlaceholder')}
            rows={4}
            maxLength={200}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              {isOverLimit && (
                <AlertCircle size={14} className="text-red-400 mr-1" />
              )}
              <span className={`text-sm ${isOverLimit ? 'text-red-400' : charCount > 140 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {t('smsBroadcast.charCount', { count: charCount })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="mr-2"
            />
            {t('smsBroadcast.activeUsersOnly')}
          </label>

          <button
            onClick={handleSend}
            disabled={sending || !message.trim() || isOverLimit}
            className="bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition flex items-center"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t('smsBroadcast.sending')}
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                {t('smsBroadcast.sendBroadcast')}
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        {message && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-600">
            <p className="text-gray-500 text-xs mb-2">{t('smsBroadcast.smsPreview')}</p>
            <p className="text-white text-sm">{message}</p>
          </div>
        )}
      </div>

      {/* Broadcast History */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-5 border-b border-gray-700">
          <h3 className="text-white font-semibold flex items-center">
            <Clock size={18} className="mr-2 text-gray-400" />
            {t('smsBroadcast.broadcastHistory')}
          </h3>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t('smsBroadcast.noBroadcasts')}</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {history.map(broadcast => (
              <div key={broadcast.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{formatDate(broadcast.sentAt)}</span>
                  <span className="text-sushi-400 text-sm">{t('smsBroadcast.recipients', { count: broadcast.recipientCount })}</span>
                </div>
                <p className="text-white text-sm">{broadcast.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
