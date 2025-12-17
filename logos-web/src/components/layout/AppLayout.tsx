import { Outlet, Link, useLocation } from "react-router-dom"
import { Atom, ShoppingBag, User, LayoutGrid, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"

export function AppLayout() {
  const { logout, user } = useAuthStore()
  const location = useLocation()

  // Lógica para identificar a rota ativa
  // Para a galáxia, verificamos se começa com /universe, pois o ID muda dinamicamente
  const isGalaxyActive = location.pathname.startsWith('/universe')
  
  // Para outras rotas, verificamos a igualdade exata
  const isActive = (path: string) => location.pathname === path

  // Define o link do universo baseado no ID do usuário logado (ou fallback)
  const userUniverseLink = `/universe/${user?.id || 'user-1'}`

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      
      {/* --- HEADER GLOBAL FIXO --- */}
      <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-[100] flex items-center justify-between px-6 transition-all">
        
        {/* 1. Logo & Branding */}
        <Link to={userUniverseLink} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/20">
            <Atom className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Logos
          </span>
        </Link>

        {/* 2. Menu de Navegação (Pill Shape) */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 shadow-lg">
          
          {/* Link Galáxia (Dinâmico) */}
          <Link to={userUniverseLink}>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 transition-all duration-300 ${isGalaxyActive ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" /> 
              Galáxia
            </Button>
          </Link>
          
          {/* Link Loja */}
          <Link to="/store">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 transition-all duration-300 ${isActive('/store') ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <ShoppingBag className="w-4 h-4 mr-2" /> 
              Loja
            </Button>
          </Link>

          {/* Link Perfil */}
          <Link to="/profile">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 transition-all duration-300 ${isActive('/profile') ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <User className="w-4 h-4 mr-2" /> 
              Perfil
            </Button>
          </Link>
        </nav>

        {/* 3. User & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-white">{user?.name || "Explorador"}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role || "GUEST"}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout} 
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sair do Sistema"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      {/* O Outlet renderiza a rota filha (Galaxy, Store, Profile) */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}