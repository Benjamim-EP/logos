import { Outlet, Link, useLocation } from "react-router-dom"
import { Atom, ShoppingBag, User, LayoutGrid, LogOut, Microscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"

export function AppLayout() {
  const { logout, user } = useAuthStore()
  const location = useLocation()

  const isGalaxyActive = location.pathname.startsWith('/universe')
  const isActive = (path: string) => location.pathname === path
  const userUniverseLink = `/universe/${user?.id || 'user-1'}`

  return (
    // CORREÇÃO 1: h-screen (altura fixa da tela) + overflow-hidden
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER FIXO (h-16 = 64px) */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-between px-6">
        
        {/* Logo */}
        <Link to={userUniverseLink} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/20">
            <Atom className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Logos
          </span>
        </Link>

        {/* Menu */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 shadow-lg">
          <Link to={userUniverseLink}>
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isGalaxyActive ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <LayoutGrid className="w-4 h-4 mr-2" /> Galáxia
            </Button>
          </Link>
          <Link to="/store">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/store') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <ShoppingBag className="w-4 h-4 mr-2" /> Loja
            </Button>
          </Link>
          {/* NOVO LINK DE PESQUISA */}
          <Link to="/research">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 transition-all duration-300 ${isActive('/research') ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Microscope className="w-4 h-4 mr-2" /> 
              Pesquisa
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/profile') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <User className="w-4 h-4 mr-2" /> Perfil
            </Button>
          </Link>
        </nav>

        {/* User */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-white">{user?.name || "Explorador"}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role || "GUEST"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* 
          CORREÇÃO 2: Conteúdo Principal 
          flex-1 garante que ocupe o resto da altura.
          relative w-full h-full garante que o Canvas (filho) tenha dimensões para renderizar.
      */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}