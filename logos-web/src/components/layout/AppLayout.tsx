import { Outlet, Link, useLocation } from "react-router-dom"
import { Atom, ShoppingBag, User, LayoutGrid, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"

export function AppLayout() {
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* HEADER DE NAVEGAÇÃO GLOBAL */}
      <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-[100] flex items-center justify-between px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Atom className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-lg tracking-tight">Logos</span>
        </div>

        {/* Menu Central */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
          <Link to="/">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <LayoutGrid className="w-4 h-4 mr-2" /> Galáxia
            </Button>
          </Link>
          
          <Link to="/store">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/store') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <ShoppingBag className="w-4 h-4 mr-2" /> Loja de Universos
            </Button>
          </Link>

          <Link to="/profile">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/profile') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <User className="w-4 h-4 mr-2" /> Perfil
            </Button>
          </Link>
        </nav>

        {/* Ações Usuário */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-white">{user?.name}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="hover:bg-red-500/10 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* CONTEÚDO DA PÁGINA (Outlet do Router) */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}