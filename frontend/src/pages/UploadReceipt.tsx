import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, Check, X, Edit3 } from 'lucide-react';
import api from '../services/api';

interface UploadResponse {
  mealId: number;
  extractedTotal: number | null;
  extractedDate: string | null;
  extractedRestaurant: string | null;
  needsManualEntry: boolean;
}

export default function UploadReceipt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [manualTotal, setManualTotal] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const response = await api.upload<UploadResponse>('/meals/upload', file);
      setResult(response);
      if (!response.needsManualEntry) {
        // Auto-verified, show success briefly then redirect
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    setConfirming(true);
    setError('');
    try {
      const total = manualTotal ? parseFloat(manualTotal) : null;
      await api.post(`/meals/${result.mealId}/confirm`, { manualTotal: total });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.confirmFailed'));
    } finally {
      setConfirming(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setManualTotal('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">{t('upload.title')}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Success state */}
      {result && !result.needsManualEntry && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-400 mb-2">{t('upload.receiptVerified')}</h2>
          <div className="space-y-2 text-gray-300">
            {result.extractedRestaurant && (
              <p><span className="text-gray-500">{t('upload.restaurantLabel')}</span> {result.extractedRestaurant}</p>
            )}
            {result.extractedTotal && (
              <p><span className="text-gray-500">{t('upload.totalLabel')}</span> ${result.extractedTotal.toFixed(2)}</p>
            )}
            {result.extractedDate && (
              <p><span className="text-gray-500">{t('upload.dateLabel')}</span> {result.extractedDate}</p>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-4">{t('upload.redirecting')}</p>
        </div>
      )}

      {/* Manual entry needed */}
      {result && result.needsManualEntry && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-6">
          <div className="text-center mb-4">
            <Edit3 className="inline text-yellow-400" size={32} />
            <h2 className="text-lg font-bold text-yellow-400 mt-2">{t('upload.manualEntryNeeded')}</h2>
            <p className="text-gray-400 text-sm">{t('upload.manualEntryHint')}</p>
          </div>

          {preview && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img src={preview} alt="Receipt" className="w-full max-h-48 object-contain bg-gray-900" />
            </div>
          )}

          {/* Show extracted data if any */}
          {(result.extractedRestaurant || result.extractedDate) && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
              {result.extractedRestaurant && (
                <p className="text-gray-300"><span className="text-gray-500">{t('upload.restaurantLabel')}</span> {result.extractedRestaurant}</p>
              )}
              {result.extractedDate && (
                <p className="text-gray-300"><span className="text-gray-500">{t('upload.dateLabel')}</span> {result.extractedDate}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('upload.totalAmount')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={manualTotal}
              onChange={(e) => setManualTotal(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sushi-500 focus:border-transparent text-lg"
              placeholder={t('upload.totalPlaceholder')}
              autoFocus
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleConfirm}
              disabled={confirming || !manualTotal}
              className="flex-1 bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center"
            >
              <Check size={18} className="mr-2" />
              {confirming ? t('upload.confirming') : t('upload.confirmMeal')}
            </button>
            <button
              onClick={resetUpload}
              className="px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Upload area */}
      {!result && (
        <>
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 hover:border-sushi-500 rounded-xl p-12 text-center cursor-pointer transition-all hover:bg-gray-800/50"
            >
              <Camera className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-white font-medium mb-2">{t('upload.tapToPhoto')}</p>
              <p className="text-gray-500 text-sm">{t('upload.supportedFormats')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gray-900">
                <img src={preview} alt="Receipt preview" className="w-full max-h-96 object-contain" />
                <button
                  onClick={resetUpload}
                  className="absolute top-3 right-3 bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    {t('upload.scanning')}
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    {t('upload.uploadAndScan')}
                  </>
                )}
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
