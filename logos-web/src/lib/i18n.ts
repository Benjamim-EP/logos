import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend) // Carrega arquivos JSON da pasta public/locales
  .use(LanguageDetector) // Detecta idioma do browser/localStorage
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'], // Salva a escolha do usuário aqui
    },
    backend: {
      loadPath: '/locales/{{lng}}.json', // Onde ficarão os arquivos
    }
  });

export default i18n;