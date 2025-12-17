import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"

// Layouts e Páginas
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/features/auth/LoginPage"
import { GalaxyCanvas } from "@/features/galaxy/GalaxyCanvas"
import { ProfilePage } from "@/features/profile/ProfilePage"
import { UniverseStorePage } from "@/features/store/UniverseStorePage"

// Componente de Proteção de Rota
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas Privadas (Protegidas por Layout e Auth) */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/" element={<GalaxyCanvas />} />
          <Route path="/store" element={<UniverseStorePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Futuro: Rota dinâmica para ver detalhes */}
          <Route path="/universe/:id" element={<div className="text-white p-10">Visualizador de Universo (Em breve)</div>} />
        </Route>

        {/* Fallback (404) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App