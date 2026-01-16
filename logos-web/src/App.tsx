import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "react-oidc-context"
import { useAuthStore } from "@/stores/authStore"
import { Loader2 } from "lucide-react"


import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/features/auth/LoginPage"
import { GalaxyCanvas } from "@/features/galaxy/GalaxyCanvas"
import { ProfilePage } from "@/features/profile/ProfilePage"
import { UniverseStorePage } from "@/features/store/UniverseStorePage"
import { ResearchPage } from "@/features/research/ResearchPage"
import { BookShelf } from "./features/library/BookShelf"
import { Toaster } from "./components/ui/sonner"

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  const auth = useAuth()
  const setAuthData = useAuthStore((state) => state.setAuthData)
  const isGuest = useAuthStore((state) => state.isGuest) 
  const user = useAuthStore((state) => state.user)

  const defaultUniverse = user ? (isGuest ? '/universe/guest' : `/universe/${user.id}`) : '/login'

  useEffect(() => {
    if (isGuest) {
        return; 
    }
    if (auth.isAuthenticated && auth.user) {
      setAuthData({
        isAuthenticated: true,
        user: {
          id: auth.user.profile.sub || "user-1",
          name: auth.user.profile.preferred_username || "Explorador",
          role: "explorer",
          token: auth.user.access_token
        }
      })
    } 
    else if (!auth.isLoading && !auth.isAuthenticated) {
        setAuthData({ isAuthenticated: false, user: null })
    }
  }, [auth.isAuthenticated, auth.user, auth.isLoading, setAuthData, isGuest])

  if (auth.isLoading && !isGuest) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-gray-400 text-sm font-mono tracking-widest uppercase">Inicializando Sistemas...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          
          <Route path="/" element={<Navigate to={defaultUniverse} replace />} />
          <Route path="/universe/:universeId" element={<GalaxyCanvas />} />

          <Route path="/library" element={<BookShelf />} />
          <Route path="/store" element={<UniverseStorePage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" theme="dark" richColors />
    </BrowserRouter>
  )
}

export default App