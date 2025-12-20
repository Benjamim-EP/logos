import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "react-oidc-context"
// --- IMPORTS NOVOS DO REACT QUERY ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 1. Instância do Cliente (Gerenciador de Cache)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita recarregar dados só de trocar de aba
      retry: 1, // Tenta mais uma vez se der erro
    },
  },
})

const oidcConfig = {
  authority: "http://localhost:8085/realms/logos-realm",
  client_id: "logos-app",
  redirect_uri: window.location.origin + "/",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. Envolvemos a aplicação com o Provider do React Query */}
    <QueryClientProvider client={queryClient}>
      <AuthProvider {...oidcConfig}>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)