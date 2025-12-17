import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"

import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/features/auth/LoginPage"
import { GalaxyCanvas } from "@/features/galaxy/GalaxyCanvas"
import { ProfilePage } from "@/features/profile/ProfilePage"
import { UniverseStorePage } from "@/features/store/UniverseStorePage"

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  // Pegamos o ID do usuário para redirecionar para o universo dele
  const user = useAuthStore((state) => state.user)
  const defaultUniverse = user ? `/universe/${user.id}` : '/login'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          {/* Rota Raiz agora redireciona para o Universo do Usuário */}
          <Route path="/" element={<Navigate to={defaultUniverse} replace />} />
          
          {/* ROTA DINÂMICA: Aqui está a mágica */}
          <Route path="/universe/:universeId" element={<GalaxyCanvas />} />
          
          <Route path="/store" element={<UniverseStorePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App