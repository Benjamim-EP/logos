import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "react-oidc-context"
import { useAuthStore } from "@/stores/authStore"
import { Loader2 } from "lucide-react"

// Layouts e Páginas
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/features/auth/LoginPage"
import { GalaxyCanvas } from "@/features/galaxy/GalaxyCanvas"
import { ProfilePage } from "@/features/profile/ProfilePage"
import { UniverseStorePage } from "@/features/store/UniverseStorePage"
import { ResearchPage } from "@/features/research/ResearchPage"
import { BookShelf } from "./features/library/BookShelf"

/**
 * Componente de Guarda de Rota (Route Guard)
 * Verifica se o usuário está autenticado na Store antes de renderizar o conteúdo.
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  // Se não estiver logado, manda para o login.
  // Nota: O loading global no App component impede que isso aconteça prematuramente.
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  // Hook do Keycloak (OIDC)
  const auth = useAuth()
  
  // Actions do nosso Estado Global
  const setAuthData = useAuthStore((state) => state.setAuthData)
  const user = useAuthStore((state) => state.user)

  // Define qual é a "Home" do usuário (O Universo dele)
  const defaultUniverse = user ? `/universe/${user.id}` : '/login'

  // --- EFEITO DE SINCRONIZAÇÃO (OIDC -> ZUSTAND) ---
  useEffect(() => {
    // 1. Se o Keycloak confirmou o login
    if (auth.isAuthenticated && auth.user) {
      setAuthData({
        isAuthenticated: true,
        user: {
          // Mapeia os dados do Token JWT para nosso formato interno
          id: auth.user.profile.sub || "user-1",
          name: auth.user.profile.preferred_username || auth.user.profile.name || "Explorador",
          role: "explorer", // Poderia vir de auth.user.profile.realm_access.roles
          token: auth.user.access_token
        }
      })
    } 
    // 2. Se o Keycloak confirmou que NÃO estamos logados (e parou de carregar)
    else if (!auth.isLoading && !auth.isAuthenticated) {
      setAuthData({ isAuthenticated: false, user: null })
    }
  }, [auth.isAuthenticated, auth.user, auth.isLoading, setAuthData])

  // --- LOADING GLOBAL ---
  // Enquanto o Keycloak verifica cookies/tokens no onload, mostramos um loading.
  // Isso evita o "piscar" da tela de login para usuários já logados.
  if (auth.isLoading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-gray-400 text-sm font-mono tracking-widest uppercase">Inicializando Sistemas...</p>
      </div>
    )
  }

  // --- ROTEAMENTO ---
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública de Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas Privadas (Protegidas pelo Layout e Auth) */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          
          {/* A raiz redireciona para o universo específico do usuário */}
          <Route path="/" element={<Navigate to={defaultUniverse} replace />} />
          
          {/* O Canvas Principal (Galáxia) */}
          <Route path="/universe/:universeId" element={<GalaxyCanvas />} />

          <Route path="/library" element={<BookShelf />} />
          
          {/* Módulos Adicionais */}
          <Route path="/store" element={<UniverseStorePage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          
        </Route>

        {/* Fallback 404 - Volta para o início */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App