import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "react-oidc-context"
import { useAuthStore } from "@/stores/authStore"
import { CloudLightning, Loader2 } from "lucide-react"


import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/features/auth/LoginPage"
import { GalaxyCanvas } from "@/features/galaxy/GalaxyCanvas"
import { ProfilePage } from "@/features/profile/ProfilePage"
import { UniverseStorePage } from "@/features/store/UniverseStorePage"
import { ResearchPage } from "@/features/research/ResearchPage"
import { BookShelf } from "./features/library/BookShelf"
import { Toaster } from "./components/ui/sonner"
import { t } from "i18next"

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
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-white relative overflow-hidden">
        
        {/* Efeito de Fundo Sutil */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="z-10 flex flex-col items-center gap-6 max-w-md text-center p-6">
            <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                <div className="absolute inset-0 blur-lg bg-blue-500/30 animate-pulse" />
            </div>
            
            <div className="space-y-2">
                <p className="text-lg font-bold tracking-widest uppercase text-white">
                    {t('common.loading_system')}
                </p>
                
                {/* AVISO DE COLD START */}
                <div className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 p-4 rounded-lg mt-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <CloudLightning className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Google Cloud Run</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        {t('common.cold_start_warning')}
                    </p>
                </div>
            </div>
        </div>
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