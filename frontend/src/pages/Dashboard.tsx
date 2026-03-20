import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Gift, Bell, ChevronRight, TrendingUp, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface MealDto {
  id: number;
  extractedTotal: number | null;
  extractedDate: string | null;
  extractedRestaurant: string | null;
  manualTotal: number | null;
  status: string;
  createdAt: string;
}

interface RewardDto {
  id: number;
  type: string;
  status: string;
  earnedAt: string;
  redeemedAt: string | null;
}

interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardData {
  mealsInPeriod: number;
  mealsRequired: number;
  periodStart: string;
  periodEnd: string;
  recentMeals: MealDto[];
  activeRewards: RewardDto[];
  notifications: Notification[];
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>('/meals/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍣</div>
          <p className="text-gray-400">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  const progress = data ? Math.min((data.mealsInPeriod / data.mealsRequired) * 100, 100) : 0;
  const mealsLeft = data ? Math.max(data.mealsRequired - data.mealsInPeriod, 0) : 10;
  const unreadNotifications = data?.notifications.filter(n => !n.isRead).length || 0;

  const getMealAmount = (meal: MealDto) => {
    const amount = meal.manualTotal ?? meal.extractedTotal;
    return amount ? `$${amount.toFixed(2)}` : t('common.na');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  const nameSegment = user?.displayName ? t('dashboard.welcomeName', { name: user.displayName }) : '';

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {t('dashboard.welcome', { name: nameSegment })}
        </h1>
        <p className="text-gray-400 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-sushi-900/50 to-sushi-800/30 rounded-xl p-6 border border-sushi-700/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center">
              <TrendingUp className="mr-2 text-sushi-400" size={20} />
              {t('dashboard.mealProgress')}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {t('dashboard.rollingPeriod')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-sushi-400">{data?.mealsInPeriod ?? 0}</span>
            <span className="text-gray-400 text-lg">/{data?.mealsRequired ?? 10}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-4 mb-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sushi-500 to-sushi-400 h-4 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm text-gray-300">
          {mealsLeft > 0 ? (
            <span className="text-sushi-400 font-medium">
              {t('dashboard.mealsLeft', { count: mealsLeft })}
            </span>
          ) : (
            <span className="text-green-400 font-medium">{t('dashboard.earnedFreeMeal')}</span>
          )}
        </p>
      </div>

      {/* Profile prompt if no name set */}
      {!user?.displayName && (
        <div
          onClick={() => navigate('/profile')}
          className="bg-orange-900/30 border border-orange-700/50 rounded-xl p-4 mb-6 flex items-center justify-between cursor-pointer hover:bg-orange-900/40 transition"
        >
          <div className="flex items-center">
            <UserCircle className="text-orange-400 mr-3 flex-shrink-0" size={24} />
            <div>
              <p className="text-white font-medium">{t('dashboard.completeProfile')}</p>
              <p className="text-orange-300/70 text-sm">{t('dashboard.completeProfileHint')}</p>
            </div>
          </div>
          <ChevronRight className="text-orange-400 flex-shrink-0" size={20} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/upload')}
          className="bg-sushi-600 hover:bg-sushi-700 rounded-xl p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Camera className="text-white mb-3" size={28} />
          <h3 className="text-white font-semibold">{t('dashboard.uploadReceipt')}</h3>
          <p className="text-sushi-200 text-sm mt-1">{t('dashboard.uploadReceiptHint')}</p>
        </button>

        <button
          onClick={() => navigate('/rewards')}
          className="bg-gray-800 hover:bg-gray-700 rounded-xl p-5 text-left border border-gray-700 transition-all hover:scale-[1.02] active:scale-[0.98] relative"
        >
          <Gift className="text-sushi-400 mb-3" size={28} />
          <h3 className="text-white font-semibold">{t('dashboard.myRewards')}</h3>
          <p className="text-gray-400 text-sm mt-1">{t('dashboard.myRewardsHint')}</p>
          {(data?.activeRewards.length ?? 0) > 0 && (
            <span className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
              {data?.activeRewards.length}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="bg-gray-800 hover:bg-gray-700 rounded-xl p-5 text-left border border-gray-700 transition-all hover:scale-[1.02] active:scale-[0.98] relative"
        >
          <Bell className="text-sushi-400 mb-3" size={28} />
          <h3 className="text-white font-semibold">{t('dashboard.notifications')}</h3>
          <p className="text-gray-400 text-sm mt-1">{t('dashboard.notificationsHint')}</p>
          {unreadNotifications > 0 && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {/* Active Rewards */}
      {(data?.activeRewards.length ?? 0) > 0 && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-5 mb-6">
          <h3 className="text-green-400 font-semibold mb-3 flex items-center">
            <Gift size={18} className="mr-2" />
            {t('dashboard.activeRewards')}
          </h3>
          {data?.activeRewards.map(reward => (
            <div key={reward.id} className="flex items-center justify-between bg-green-900/30 rounded-lg p-3 mb-2">
              <div>
                <span className="text-white font-medium">{t('dashboard.freeMeal')}</span>
                <p className="text-green-300 text-sm">{t('dashboard.earned', { date: formatDate(reward.earnedAt) })}</p>
              </div>
              <span className="text-green-400 text-sm font-medium px-3 py-1 bg-green-900/50 rounded-full">
                {t('dashboard.showToRedeem')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Meals */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h3 className="text-white font-semibold">{t('dashboard.recentMeals')}</h3>
          <button
            onClick={() => navigate('/meals')}
            className="text-sushi-400 hover:text-sushi-300 text-sm flex items-center"
          >
            {t('dashboard.viewAll')} <ChevronRight size={16} />
          </button>
        </div>

        {(!data?.recentMeals || data.recentMeals.length === 0) ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📱</div>
            <p className="text-gray-400">{t('dashboard.noMealsYet')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {data.recentMeals.map(meal => (
              <div key={meal.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {meal.extractedRestaurant || t('common.restaurant')}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {meal.extractedDate || formatDate(meal.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{getMealAmount(meal)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    meal.status === 'Verified' 
                      ? 'bg-green-900/50 text-green-400' 
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}>
                    {meal.status === 'Verified' ? t('meals.statusVerified') : t('meals.statusPending')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
