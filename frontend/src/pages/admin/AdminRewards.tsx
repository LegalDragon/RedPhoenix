import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, CheckCircle, Clock, Filter } from 'lucide-react';
import api from '../../services/api';

interface RewardDto {
  id: number;
  userId: number;
  phone: string | null;
  displayName: string | null;
  type: string;
  status: string;
  earnedAt: string;
  redeemedAt: string | null;
  periodStart: string;
  periodEnd: string;
}

export default function AdminRewards() {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<RewardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const loadRewards = () => {
    const url = filter ? `/rewards/all?status=${filter}` : '/rewards/all';
    api.get<RewardDto[]>(url)
      .then(setRewards)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRewards(); }, [filter]);

  const handleRedeem = async (id: number) => {
    if (!confirm(t('adminRewards.confirmRedeem'))) return;
    setRedeeming(id);
    try {
      await api.post(`/rewards/${id}/redeem`, {});
      loadRewards();
    } catch (err) {
      console.error(err);
    } finally {
      setRedeeming(null);
    }
  };

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Earned': return t('meals.statusVerified').replace(t('meals.statusVerified'), status);
      case 'Redeemed': return t('rewards.redeemedLabel');
      default: return status;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">{t('adminRewards.loadingRewards')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('adminRewards.title')}</h1>
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sushi-500"
          >
            <option value="">{t('adminRewards.filterAll')}</option>
            <option value="Earned">{t('adminRewards.filterEarned')}</option>
            <option value="Redeemed">{t('adminRewards.filterRedeemed')}</option>
            <option value="Expired">{t('adminRewards.filterExpired')}</option>
          </select>
        </div>
      </div>

      {rewards.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Gift className="mx-auto text-gray-500 mb-4" size={48} />
          <p className="text-gray-400">{t('adminRewards.noRewards')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map(reward => (
            <div
              key={reward.id}
              className={`rounded-xl p-5 border ${
                reward.status === 'Earned'
                  ? 'bg-green-900/10 border-green-700/50'
                  : reward.status === 'Redeemed'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-800 border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center mb-1">
                    {reward.status === 'Earned' ? (
                      <Gift className="text-green-400 mr-2" size={18} />
                    ) : reward.status === 'Redeemed' ? (
                      <CheckCircle className="text-gray-400 mr-2" size={18} />
                    ) : (
                      <Clock className="text-gray-500 mr-2" size={18} />
                    )}
                    <span className="text-white font-medium">
                      {reward.displayName || (reward.phone ? formatPhone(reward.phone) : `${t('common.user')} #${reward.userId}`)}
                    </span>
                    <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${
                      reward.status === 'Earned'
                        ? 'bg-green-900/50 text-green-400'
                        : reward.status === 'Redeemed'
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {getStatusText(reward.status)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {reward.redeemedAt
                      ? t('adminRewards.earnedRedeemed', { earned: formatDate(reward.earnedAt), redeemed: formatDate(reward.redeemedAt) })
                      : t('adminRewards.earned', { date: formatDate(reward.earnedAt) })
                    }
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {t('adminRewards.period', { start: formatDate(reward.periodStart), end: formatDate(reward.periodEnd) })}
                  </p>
                </div>

                {reward.status === 'Earned' && (
                  <button
                    onClick={() => handleRedeem(reward.id)}
                    disabled={redeeming === reward.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition text-sm flex items-center"
                  >
                    {redeeming === reward.id ? (
                      t('adminRewards.redeeming')
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-1" />
                        {t('adminRewards.redeem')}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
