import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en', // Se não achar o idioma, usa inglês
    debug: true, // IMPORTANTE: Mantenha true para ver o erro no console do Chrome
    
    interpolation: {
      escapeValue: false,
    },
    
    // Configurações de detecção
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    backend: {
      // Tenta carregar da raiz. O Vite serve a pasta 'public' na raiz '/'.
      loadPath: '/locales/{{lng}}.json',
      
      // Opcional: Adicione um timestamp para evitar cache do navegador durante dev
      queryStringParams: { v: '1.0.0' }
    },

    react: {
      useSuspense: true 
    }
  });

export default i18n;