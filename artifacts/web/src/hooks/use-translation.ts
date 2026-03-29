import { create } from 'zustand';
import { translations, Language } from '@/lib/i18n';

interface TranslationStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const useTranslationStore = create<TranslationStore>((set) => ({
  language: 'pt',
  setLanguage: (lang) => set({ language: lang }),
}));

export function useTranslation() {
  const { language, setLanguage } = useTranslationStore();
  
  const t = (key: keyof typeof translations['pt']) => {
    return translations[language][key] || translations['pt'][key] || key;
  };

  return { t, language, setLanguage };
}
