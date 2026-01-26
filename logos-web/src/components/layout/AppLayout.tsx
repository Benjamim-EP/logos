import { useState, useEffect } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { ShoppingBag, User, LayoutGrid, LogOut, Microscope, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"
import { useTranslation } from "react-i18next"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { GuestUniverseModal } from "@/features/auth/components/GuestUniverseModal"
import { useAuth } from "react-oidc-context"

export function AppLayout() {
   const auth = useAuth()
  const { logout: storeLogout, user, isGuest, guestUniverse, setGuestUniverse } = useAuthStore()
  const location = useLocation()
  const { t, i18n } = useTranslation() 

   const navigate = useNavigate()

  const isGalaxyActive = location.pathname.startsWith('/universe')
  const isActive = (path: string) => location.pathname === path
  const userUniverseLink = `/universe/${user?.id || 'user-1'}`

  const [showGuestModal, setShowGuestModal] = useState(false)
  useEffect(() => {
    if (isGuest && !guestUniverse) {
        setShowGuestModal(true)
    } else {
        setShowGuestModal(false)
    }
  }, [isGuest, guestUniverse])

  const handleGuestSelect = (universeId: string, lang: string, pineconeFilter: string) => {
    setGuestUniverse({ id: universeId, lang, pineconeFilter })
    setShowGuestModal(false)
    window.location.href = "/universe/guest" 
    navigate("/universe/guest")
  }

  const handleGuestEmpty = () => {
    setGuestUniverse({ 
        id: 'empty', 
        lang: i18n.language, 
        pineconeFilter: 'none' 
    })
    setShowGuestModal(false)
    window.location.href = "/universe/guest"
    navigate("/universe/guest")
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const getNavButtonClass = (active: boolean) => {
    return `rounded-full px-4 transition-all duration-300 ${
      active 
        ? 'bg-white/10 text-white hover:bg-white/20' // Ativo: Fundo visível, hover leve
        : 'text-zinc-400 hover:text-white hover:bg-white/5' // Inativo: Fundo transparente, hover escuro
    }`
  }

  const getFlag = () => {
    if (i18n.language === 'pl') return '🇵🇱';
    if (i18n.language === 'pt') return '🇧🇷';
    return '🇺🇸';
  }

  const handleLogout = () => {
      storeLogout();
      if (isGuest) {
          window.location.href = "/login";
          return;
      }
      auth.signoutRedirect({ 
          post_logout_redirect_uri: window.location.origin + "/login" 
      });
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans relative">
      
      <header className="h-16 shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-between px-6">
        <Link to={userUniverseLink} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 rounded-full"></div>
            <img src="/logo-icon.png" alt="Logos" className="w-8 h-8 relative z-10" />
            </div>
            <span className="font-bold text-xl tracking-widest text-white font-sans">LOGOS</span>
        </Link>

        {/* --- CORREÇÃO AQUI NA NAV --- */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 shadow-lg">
          
          <Link to={userUniverseLink}>
            <Button variant="ghost" size="sm" className={getNavButtonClass(isGalaxyActive)}>
              <LayoutGrid className="w-4 h-4 mr-2" /> {t('nav.galaxy')}
            </Button>
          </Link>
          
          <Link to="/library">
            <Button variant="ghost" size="sm" className={getNavButtonClass(isActive('/library'))}>
              <Library className="w-4 h-4 mr-2" /> {t('nav.library')}
            </Button>
          </Link>
          
          <Link to="/store">
            <Button variant="ghost" size="sm" className={getNavButtonClass(isActive('/store'))}>
              <ShoppingBag className="w-4 h-4 mr-2" /> {t('nav.store')}
            </Button>
          </Link>
          
          <Link to="/research">
            <Button variant="ghost" size="sm" className={getNavButtonClass(isActive('/research'))}>
              <Microscope className="w-4 h-4 mr-2" /> {t('nav.research')}
            </Button>
          </Link>
          
          <Link to="/profile">
            <Button variant="ghost" size="sm" className={getNavButtonClass(isActive('/profile'))}>
              <User className="w-4 h-4 mr-2" /> {t('nav.profile')}
            </Button>
          </Link>

        </nav>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-12 px-0 rounded-full border border-white/10 bg-white/5"><span className="text-lg">{getFlag()}</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-white min-w-[120px]">
              <DropdownMenuItem onClick={() => changeLanguage('en')}><span>🇺🇸</span> English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('pt')}><span>🇧🇷</span> Português</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('pl')}><span>🇵🇱</span> Polski</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-white">{user?.name || t('nav.guest')}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role || "GUEST"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 relative w-full h-full overflow-hidden">
        <Outlet />
      </main>
      <GuestUniverseModal 
        isOpen={showGuestModal} 
        onClose={() => {}}
        onSelect={handleGuestSelect}
        onSelectEmpty={handleGuestEmpty}
      />
    </div>
  )
}