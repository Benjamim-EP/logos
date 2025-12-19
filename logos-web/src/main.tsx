import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "react-oidc-context"

// Configuração do Keycloak
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
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)