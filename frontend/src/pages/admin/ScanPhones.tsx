import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Phone, CheckCircle, AlertCircle, Send, Upload, X, UserPlus, Loader2, ClipboardList, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';

interface ScannedPhone {
  phone: string;
  name: string | null;
  alreadyExists: boolean;
  uncertain: boolean;
}

interface ScanPhonesResponse {
  scanId: number | null;
  phones: ScannedPhone[];
}

interface PhoneScanRecord {
  id: number;
  imageAssetId: number | null;
  imageUrl: string;
  scannedData: string | null;
  scannedBy: number | null;
  scannedAt: string;
  reviewedAt: string | null;
  reviewedBy: number | null;
  notes: string | null;
}

interface ImportPhonesResponse {
  importedCount: number;
  skippedCount: number;
  importedPhones: string[];
}

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

// Resize image to max dimension to reduce payload size (Cloudflare blocks large bodies)
function resizeImage(dataUrl: string, maxDim = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
}

export default function ScanPhones() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & scan state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedPhones, setScannedPhones] = useState<ScannedPhone[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [scanError, setScanError] = useState('');

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportPhonesResponse | null>(null);

  // Unverified users state
  const [unverifiedUsers, setUnverifiedUsers] = useState<UserWithStats[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Test SMS state
  const [smsUserId, setSmsUserId] = useState<number | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState('');

  // Scan history state
  const [scanHistory, setScanHistory] = useState<PhoneScanRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedScanId, setExpandedScanId] = useState<number | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [scanSaved, setScanSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadUnverifiedUsers = () => {
    setLoadingUsers(true);
    api.get<UserWithStats[]>('/admin/users')
      .then(users => {
        setUnverifiedUsers(users.filter(u => !u.isPhoneVerified));
      })
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  };

  const loadScanHistory = () => {
    setLoadingHistory(true);
    api.get<PhoneScanRecord[]>('/admin/phone-scans')
      .then(setScanHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadUnverifiedUsers(); }, []);

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setScanError('');
      setScannedPhones([]);
      setSelectedPhones(new Set());
      setImportResult(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleScan = async () => {
    if (!file || !preview) return;
    setScanning(true);
    setScanError('');
    setImportResult(null);
    setScanSaved(false);
    try {
      // Resize image to reduce payload (Cloudflare blocks large request bodies)
      const resized = await resizeImage(preview!, 2048);
      const response = await api.post<ScanPhonesResponse>('/admin/phone-scan', {
        imageData: resized
      });
      setScannedPhones(response.phones);
      if (response.scanId) {
        setScanSaved(true);
      }
      // Auto-select all non-existing, non-uncertain phones
      const autoSelected = new Set<string>();
      response.phones.forEach(p => {
        if (!p.alreadyExists) {
          autoSelected.add(p.phone);
        }
      });
      setSelectedPhones(autoSelected);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : t('scanPhones.scanFailed'));
    } finally {
      setScanning(false);
    }
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones(prev => {
      const next = new Set(prev);
      if (next.has(phone)) {
        next.delete(phone);
      } else {
        next.add(phone);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const importable = scannedPhones.filter(p => !p.alreadyExists);
    if (selectedPhones.size === importable.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(importable.map(p => p.phone)));
    }
  };

  const handleImport = async () => {
    if (selectedPhones.size === 0) return;
    setImporting(true);
    try {
      const result = await api.post<ImportPhonesResponse>('/admin/import-phones', {
        phones: Array.from(selectedPhones)
      });
      setImportResult(result);
      setScannedPhones([]);
      setSelectedPhones(new Set());
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadUnverifiedUsers();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : t('scanPhones.importFailed'));
    } finally {
      setImporting(false);
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
      setScanError(err instanceof Error ? err.message : t('scanPhones.smsFailed'));
    } finally {
      setSendingSms(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setScannedPhones([]);
    setSelectedPhones(new Set());
    setScanError('');
    setImportResult(null);
    setScanSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReviewScan = async (scanId: number) => {
    setReviewingId(scanId);
    try {
      await api.post<{ message: string }>(`/admin/phone-scans/${scanId}/review`, { notes: null });
      setScanHistory(prev => prev.map(s =>
        s.id === scanId ? { ...s, reviewedAt: new Date().toISOString() } : s
      ));
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to review scan');
    } finally {
      setReviewingId(null);
    }
  };

  const importableCount = scannedPhones.filter(p => !p.alreadyExists).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">{t('scanPhones.title')}</h1>

      {/* Error display */}
      {scanError && (
        <div className="p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-sm flex items-center justify-between">
          <span>{scanError}</span>
          <button onClick={() => setScanError('')} className="text-red-400 hover:text-red-300"><X size={16} /></button>
        </div>
      )}

      {/* SMS Success */}
      {smsSuccess && (
        <div className="p-3 bg-green-900/50 border border-green-500 text-green-300 rounded-lg text-sm flex items-center justify-between">
          <span>{smsSuccess}</span>
          <button onClick={() => setSmsSuccess('')} className="text-green-400 hover:text-green-300"><X size={16} /></button>
        </div>
      )}

      {/* Import Success */}
      {importResult && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 text-center">
          <CheckCircle className="mx-auto text-green-400 mb-3" size={40} />
          <h2 className="text-lg font-bold text-green-400 mb-2">{t('scanPhones.importSuccess')}</h2>
          <p className="text-gray-300">
            {t('scanPhones.importedCount', { count: importResult.importedCount })}
            {importResult.skippedCount > 0 && (
              <span className="text-gray-500"> · {t('scanPhones.skippedCount', { count: importResult.skippedCount })}</span>
            )}
          </p>
        </div>
      )}

      {/* Upload & Scan Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Camera size={20} className="text-sushi-400" />
          {t('scanPhones.uploadTitle')}
        </h2>

        {!preview && !scannedPhones.length ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 hover:border-sushi-500 rounded-xl p-12 text-center cursor-pointer transition-all hover:bg-gray-800/50"
          >
            <Camera className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-white font-medium mb-2">{t('scanPhones.tapToUpload')}</p>
            <p className="text-gray-500 text-sm">{t('scanPhones.uploadHint')}</p>
          </div>
        ) : preview && !scannedPhones.length ? (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-gray-900">
              <img src={preview} alt="Phone list" className="w-full max-h-96 object-contain" />
              <button
                onClick={resetUpload}
                className="absolute top-3 right-3 bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center"
            >
              {scanning ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  {t('scanPhones.scanning')}
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-2" />
                  {t('scanPhones.scanButton')}
                </>
              )}
            </button>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Saved for review notice */}
        {scanSaved && (
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg text-blue-300 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-400 flex-shrink-0" />
            Image saved for review. You can view it later in Scan History.
          </div>
        )}

        {/* Scanned Results */}
        {scannedPhones.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-sm">
                {t('scanPhones.foundNumbers', { count: scannedPhones.length })}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className="text-sm text-sushi-400 hover:text-sushi-300"
                >
                  {selectedPhones.size === importableCount ? t('scanPhones.deselectAll') : t('scanPhones.selectAll')}
                </button>
                <button
                  onClick={resetUpload}
                  className="text-sm text-gray-400 hover:text-gray-300"
                >
                  {t('scanPhones.scanAnother')}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-3 py-2 text-gray-400 text-sm w-10"></th>
                    <th className="text-left px-3 py-2 text-gray-400 text-sm">{t('scanPhones.phoneColumn')}</th>
                    <th className="text-left px-3 py-2 text-gray-400 text-sm">{t('scanPhones.nameColumn')}</th>
                    <th className="text-left px-3 py-2 text-gray-400 text-sm">{t('scanPhones.statusColumn')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {scannedPhones.map((p, idx) => (
                    <tr key={idx} className={`${p.alreadyExists ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedPhones.has(p.phone)}
                          onChange={() => togglePhone(p.phone)}
                          disabled={p.alreadyExists}
                          className="rounded border-gray-600 text-sushi-600 focus:ring-sushi-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-500" />
                          <span className="text-white font-mono">{formatPhone(p.phone)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-300 text-sm">
                        {p.name || <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {p.alreadyExists && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-900/50 text-blue-400">
                              <CheckCircle size={12} />
                              {t('scanPhones.alreadyExists')}
                            </span>
                          )}
                          {p.uncertain && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-900/50 text-yellow-400">
                              <AlertCircle size={12} />
                              {t('scanPhones.uncertain')}
                            </span>
                          )}
                          {!p.alreadyExists && !p.uncertain && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400">
                              <UserPlus size={12} />
                              {t('scanPhones.newContact')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || selectedPhones.size === 0}
              className="w-full bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center"
            >
              {importing ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  {t('scanPhones.importing')}
                </>
              ) : (
                <>
                  <UserPlus size={18} className="mr-2" />
                  {t('scanPhones.importSelected', { count: selectedPhones.size })}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Scan History Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && scanHistory.length === 0) loadScanHistory();
          }}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardList size={20} className="text-sushi-400" />
            📋 Scan History
          </h2>
          {showHistory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-3">
            {loadingHistory ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                Loading scan history...
              </div>
            ) : scanHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No phone scans yet</div>
            ) : (
              scanHistory.map(scan => {
                const isExpanded = expandedScanId === scan.id;
                const phones: ScannedPhone[] = scan.scannedData ? JSON.parse(scan.scannedData) : [];
                return (
                  <div key={scan.id} className="border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedScanId(isExpanded ? null : scan.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-700/50 transition text-left"
                    >
                      <img
                        src={`/api${scan.imageUrl}`}
                        alt={`Scan #${scan.id}`}
                        className="w-12 h-12 object-cover rounded border border-gray-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">Scan #{scan.id}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(scan.scannedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-400 text-xs">{phones.length} numbers</span>
                          {scan.reviewedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">
                              <CheckCircle size={10} />
                              Reviewed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
                              <AlertCircle size={10} />
                              Pending review
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-700 p-4 space-y-4">
                        <img
                          src={`/api${scan.imageUrl}`}
                          alt={`Scan #${scan.id} full`}
                          className="w-full max-h-96 object-contain rounded-lg bg-gray-900"
                        />

                        {phones.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-700">
                                  <th className="text-left px-3 py-2 text-gray-400">Phone</th>
                                  <th className="text-left px-3 py-2 text-gray-400">Name</th>
                                  <th className="text-left px-3 py-2 text-gray-400">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700/50">
                                {phones.map((p, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-white font-mono">{formatPhone(p.phone)}</td>
                                    <td className="px-3 py-2 text-gray-300">{p.name || '—'}</td>
                                    <td className="px-3 py-2">
                                      {p.uncertain && (
                                        <span className="text-yellow-400 text-xs">⚠ Uncertain</span>
                                      )}
                                      {p.alreadyExists && (
                                        <span className="text-blue-400 text-xs">✓ Exists</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {scan.notes && (
                          <p className="text-gray-400 text-sm">Notes: {scan.notes}</p>
                        )}

                        {!scan.reviewedAt && (
                          <button
                            onClick={() => handleReviewScan(scan.id)}
                            disabled={reviewingId === scan.id}
                            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                          >
                            {reviewingId === scan.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Eye size={14} />
                            )}
                            Mark as Reviewed
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Unverified Users Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Phone size={20} className="text-sushi-400" />
          {t('scanPhones.unverifiedTitle')}
        </h2>

        {loadingUsers ? (
          <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
        ) : unverifiedUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('scanPhones.noUnverified')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-2 text-gray-400 text-sm">{t('scanPhones.phoneColumn')}</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm">{t('scanPhones.addedColumn')}</th>
                  <th className="text-right px-4 py-2 text-gray-400 text-sm">{t('scanPhones.actionsColumn')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {unverifiedUsers.map(user => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-500" />
                        <span className="text-white">{formatPhone(user.phone)}</span>
                        {user.displayName && (
                          <span className="text-gray-500 text-sm">({user.displayName})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSmsUserId(user.id);
                          setSmsMessage('');
                          setSmsSuccess('');
                        }}
                        className="inline-flex items-center gap-1 text-sm text-sushi-400 hover:text-sushi-300"
                      >
                        <Send size={14} />
                        {t('scanPhones.sendTestSms')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test SMS Modal */}
      {smsUserId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSmsUserId(null)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Send size={20} className="text-sushi-400" />
              {t('scanPhones.sendTestSmsTitle')}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {t('scanPhones.sendingTo', {
                phone: formatPhone(unverifiedUsers.find(u => u.id === smsUserId)?.phone || '')
              })}
            </p>
            <textarea
              value={smsMessage}
              onChange={e => setSmsMessage(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder={t('scanPhones.smsPlaceholder')}
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
                    {t('scanPhones.send')}
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
