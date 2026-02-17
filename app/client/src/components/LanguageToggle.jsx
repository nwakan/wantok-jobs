import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ variant = 'button' }) {
  const { language, toggleLanguage } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLanguage}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
        title="Toggle language / Senisim tokples"
      >
        <Languages className="w-4 h-4" />
        <span className="uppercase font-semibold">{language}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      title="Toggle language / Senisim tokples"
    >
      <Languages className="w-5 h-5 text-gray-600" />
      <span className="font-medium text-gray-900">
        {language === 'en' ? 'English' : 'Tok Pisin'}
      </span>
      <span className="text-xs text-gray-500">
        {language === 'en' ? '🇵🇬 EN' : '🇵🇬 TPI'}
      </span>
    </button>
  );
}
