import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface RewardDto {
  id: number;
  type: string;
  status: string;
  earnedAt: string;
  redeemedAt: string | null;
  periodStart: string;
  periodEnd: string;
}

export default function Rewards() {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<RewardDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<RewardDto[]>('/rewards')
      .then(setRewards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">{t('rewards.loadingRewards')}</div>
      </div>
    );
  }

  const earned = rewards.filter(r => r.status === 'Earned');
  const redeemed = rewards.filter(r => r.status === 'Redeemed');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{t('rewards.title')}</h1>

      {rewards.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Gift className="mx-auto text-gray-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-white mb-2">{t('rewards.noRewardsTitle')}</h2>
          <p className="text-gray-400">
            {t('rewards.noRewardsHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active / Earned Rewards */}
          {earned.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center">
                <Gift size={20} className="mr-2" />
                {t('rewards.readyToRedeem', { count: earned.length })}
              </h2>
              <div className="space-y-3">
                {earned.map(reward => (
                  <div key={reward.id} className="bg-green-900/20 border border-green-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{t('rewards.freeMeal')}</h3>
                        <p className="text-green-300 text-sm mt-1">
                          {t('rewards.earnedOn', { date: formatDate(reward.earnedAt) })}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {t('rewards.period', { start: formatDate(reward.periodStart), end: formatDate(reward.periodEnd) })}
                        </p>
                      </div>
                      <div className="bg-green-800/50 text-green-300 px-4 py-2 rounded-lg text-sm font-medium">
                        {t('rewards.showToStaff')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Redeemed Rewards */}
          {redeemed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-3 flex items-center">
                <CheckCircle size={20} className="mr-2" />
                {t('rewards.redeemed', { count: redeemed.length })}
              </h2>
              <div className="space-y-3">
                {redeemed.map(reward => (
                  <div key={reward.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 opacity-75">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-gray-300 font-semibold">{t('rewards.freeMealPlain')}</h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {t('rewards.earnedRedeemed', { earned: formatDate(reward.earnedAt), redeemed: reward.redeemedAt ? formatDate(reward.redeemedAt) : '' })}
                        </p>
                      </div>
                      <span className="text-gray-500 text-sm flex items-center">
                        <CheckCircle size={16} className="mr-1" />
                        {t('rewards.redeemedLabel')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
