import { Outlet, Link, useLocation } from "react-router-dom"
import { Atom, ShoppingBag, User, LayoutGrid, LogOut, Microscope, Library, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"
import { useTranslation } from "react-i18next" // <--- Importante
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AppLayout() {
  const { logout, user } = useAuthStore()
  const location = useLocation()
  
  // Hook de tradução
  const { t, i18n } = useTranslation() 

  const isGalaxyActive = location.pathname.startsWith('/universe')
  const isActive = (path: string) => location.pathname === path
  const userUniverseLink = `/universe/${user?.id || 'user-1'}`

  // Função de troca de idioma
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    // Recarrega a página para garantir que todos os componentes e datas atualizem
    // Em um app React puro não precisaria, mas para limpar estados antigos é bom.
    // window.location.reload(); 
  };

  const getFlag = () => {
    if (i18n.language === 'pl') return '🇵🇱';
    if (i18n.language === 'pt') return '🇧🇷';
    return '🇺🇸';
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER FIXO */}
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

        {/* Menu Principal (Traduzido) */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 shadow-lg">
          <Link to={userUniverseLink}>
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isGalaxyActive ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <LayoutGrid className="w-4 h-4 mr-2" /> {t('nav.galaxy')}
            </Button>
          </Link>
          <Link to="/library">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 transition-all duration-300 ${isActive('/library') ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Library className="w-4 h-4 mr-2" /> 
              {t('nav.library')}
            </Button>
          </Link>
          <Link to="/store">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/store') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <ShoppingBag className="w-4 h-4 mr-2" /> {t('nav.store')}
            </Button>
          </Link>
          <Link to="/research">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`rounded-full px-4 transition-all duration-300 ${isActive('/research') ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Microscope className="w-4 h-4 mr-2" /> 
              {t('nav.research')}
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="sm" className={`rounded-full px-4 ${isActive('/profile') ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              <User className="w-4 h-4 mr-2" /> {t('nav.profile')}
            </Button>
          </Link>
        </nav>

        {/* User & Language Switcher */}
        <div className="flex items-center gap-4">
          
          {/* Seletor de Idioma */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-12 px-0 rounded-full border border-white/10 bg-white/5 hover:bg-white/10">
                <span className="text-lg">{getFlag()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-white min-w-[120px]">
              <DropdownMenuItem onClick={() => changeLanguage('en')} className="gap-2 cursor-pointer">
                <span>🇺🇸</span> English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('pt')} className="gap-2 cursor-pointer">
                <span>🇧🇷</span> Português
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('pl')} className="gap-2 cursor-pointer bg-blue-900/20 text-blue-200">
                <span>🇵🇱</span> Polski
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-white">{user?.name || t('nav.guest')}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role || "GUEST"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 relative w-full h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}