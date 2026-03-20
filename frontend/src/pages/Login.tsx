import React, { useState } from 'react';
import { Phone, ArrowRight, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length <= 10) {
      setPhone(digits);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError(t('login.invalidPhone'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError(t('login.invalidCode'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.verifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone);
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.resendFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-sushi-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Language switcher */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher className="border-gray-600" />
          </div>

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍣</div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('login.title')}</h1>
            <p className="text-gray-400">{t('login.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('login.phoneLabel')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={formatPhone(phone)}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sushi-500 focus:border-transparent text-lg"
                    placeholder={t('login.phonePlaceholder')}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">{t('login.phoneHint')}</p>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <span>{t('login.sendingCode')}</span>
                ) : (
                  <>
                    <span>{t('login.sendCode')}</span>
                    <ArrowRight className="ml-2" size={20} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('login.verificationCode')}
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sushi-500 focus:border-transparent text-2xl tracking-[0.5em] text-center"
                    placeholder={t('login.codePlaceholder')}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {t('login.sentTo', { phone: formatPhone(phone) })}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-sushi-600 hover:bg-sushi-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {loading ? t('login.verifying') : t('login.verify')}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                  className="text-gray-400 hover:text-white transition"
                >
                  {t('login.changeNumber')}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="text-sushi-400 hover:text-sushi-300 disabled:text-gray-600 transition"
                >
                  {countdown > 0 ? t('login.resendIn', { seconds: countdown }) : t('login.resendCode')}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              {t('login.terms')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
