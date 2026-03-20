import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

interface MealDto {
  id: number;
  photoPath: string | null;
  extractedTotal: number | null;
  extractedDate: string | null;
  extractedRestaurant: string | null;
  manualTotal: number | null;
  status: string;
  createdAt: string;
}

interface MealsResponse {
  meals: MealDto[];
  total: number;
  page: number;
  pageSize: number;
}

export default function Meals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<MealsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadMeals = (p: number) => {
    setLoading(true);
    api.get<MealsResponse>(`/meals?page=${p}&pageSize=10`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMeals(page); }, [page]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const getMealAmount = (meal: MealDto) => {
    const amount = meal.manualTotal ?? meal.extractedTotal;
    return amount ? `$${amount.toFixed(2)}` : t('common.na');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Verified': return t('meals.statusVerified');
      case 'Rejected': return t('meals.statusRejected');
      default: return t('meals.statusPending');
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('meals.title')}</h1>
        <button
          onClick={() => navigate('/upload')}
          className="bg-sushi-600 hover:bg-sushi-700 text-white px-4 py-2 rounded-lg transition flex items-center text-sm"
        >
          <Camera size={16} className="mr-2" />
          {t('meals.uploadReceipt')}
        </button>
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : data?.meals.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-gray-400">{t('meals.noMealsYet')}</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-700">
              {data?.meals.map(meal => (
                <div key={meal.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-750">
                  <div className="flex-1">
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
                        : meal.status === 'Rejected'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {getStatusText(meal.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-gray-400 hover:text-white disabled:opacity-30 flex items-center"
              >
                <ChevronLeft size={18} /> {t('common.previous')}
              </button>
              <span className="text-gray-400 text-sm">
                {t('meals.page', { current: page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-gray-400 hover:text-white disabled:opacity-30 flex items-center"
              >
                {t('common.next')} <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
