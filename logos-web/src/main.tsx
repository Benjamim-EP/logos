import { StrictMode, Suspense } from 'react' // <--- Importe Suspense
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "react-oidc-context"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './lib/i18n' // <--- Garanta que a config está importada

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const oidcConfig = {
  authority: "https://logos-auth-665606141998.us-central1.run.app/realms/logos-realm",
  client_id: "logos-app",
  redirect_uri: window.location.origin + import.meta.env.BASE_URL,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// Componente de Loading Simples para o i18n
const LoadingTranslation = () => (
  <div className="h-screen w-full bg-[#050505] flex items-center justify-center text-white">
    <div className="animate-pulse">Carregando idiomas...</div>
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider {...oidcConfig}>
        {/* ENVOLVA O APP COM SUSPENSE */}
        <Suspense fallback={<LoadingTranslation />}>
          <App />
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)