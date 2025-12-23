import { useState, useEffect } from "react"
import { useAuth } from "react-oidc-context"
import { Atom, Loader2, Sparkles, Chrome } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  // Redireciona automaticamente se já estiver autenticado
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate("/")
    }
  }, [auth.isAuthenticated, navigate])

  // Fluxo Padrão (Vai para a tela de Login do Keycloak)
  const handleRealLogin = async () => {
    setIsLoading(true)
    try {
      await auth.signinRedirect() 
    } catch (err) {
      console.error("Erro ao iniciar login:", err)
      setIsLoading(false)
    }
  }

  // Fluxo Google Direto (Identity Brokering)
  // O parâmetro 'kc_idp_hint' diz ao Keycloak para usar o Google imediatamente
  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await auth.signinRedirect({
        extraQueryParams: {
          kc_idp_hint: "google" 
        }
      })
    } catch (err) {
      console.error("Erro ao iniciar login Google:", err)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050505]">
      
      {/* --- BACKGROUND CÓSMICO --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      {/* --- CARD DE VIDRO (Glassmorphism) --- */}
      <Card className="w-[380px] bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl relative z-10 text-white">
        
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/5 rounded-full border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Atom className="w-8 h-8 text-blue-400 animate-spin-slow" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Logos Enterprise
          </CardTitle>
          <CardDescription className="text-gray-400">
            Acesso seguro à plataforma de inteligência.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-xs text-gray-500 bg-white/5 p-3 rounded-lg border border-white/5">
             Para acessar sua Galáxia e Biblioteca, você será redirecionado para o nosso provedor de identidade corporativo.
          </div>
          
          {/* Indicador de Segurança */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-green-500/80 uppercase tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Conexão Segura via OIDC (Keycloak)
          </div>
        </CardContent>
          
        <CardFooter className="flex flex-col gap-3">
          {/* Botão Principal */}
          <Button 
            onClick={handleRealLogin} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 h-12 shadow-lg shadow-purple-900/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Login com Keycloak
              </>
            )}
          </Button>

          {/* Divisor */}
          <div className="relative w-full py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-600 font-medium">Ou</span>
            </div>
          </div>

          {/* Botão Social Google */}
          <Button 
            onClick={handleGoogleLogin} 
            variant="outline"
            className="w-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-white h-11 gap-3 transition-all hover:border-white/20"
            disabled={isLoading}
          >
            <Chrome className="w-4 h-4 text-white" />
            Entrar com Google
          </Button>
        </CardFooter>
      </Card>
      
      {/* Footer da Página */}
      <div className="absolute bottom-6 text-gray-600 text-xs">
        &copy; 2025 Logos Platform • Secure Access
      </div>

    </div>
  )
}