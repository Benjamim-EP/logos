import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Pega o caminho base configurado no vite.config.ts (/ ou /logos/)
const baseUrl = import.meta.env.BASE_URL;

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      // CORREÇÃO: Garante que o path sempre comece da raiz do projeto (/ ou /logos/)
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}.json`.replace(/\/+/g, '/'),
      queryStringParams: { v: '1.0.5' }
    },
    react: {
      useSuspense: true 
    }
  });

export default i18n;