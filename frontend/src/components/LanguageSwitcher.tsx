import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en';

  const toggle = () => {
    const next = currentLang === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center text-xs rounded-full border transition-colors ${className}`}
    >
      <span
        className={`px-2 py-1 rounded-full transition-colors ${
          currentLang === 'en'
            ? 'bg-sushi-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        EN
      </span>
      <span
        className={`px-2 py-1 rounded-full transition-colors ${
          currentLang === 'zh'
            ? 'bg-sushi-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        中文
      </span>
    </button>
  );
}
