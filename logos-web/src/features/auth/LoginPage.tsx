import { useState, useEffect } from "react"
import { useAuth } from "react-oidc-context"
import { useNavigate } from "react-router-dom"
import { Atom, Loader2, Sparkles, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  // 1. Redirecionamento Automático
  // Se o OIDC confirmar que estamos logados, sai dessa tela imediatamente
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate("/")
    }
  }, [auth.isAuthenticated, navigate])

  // 2. Ação de Login Real
  const handleRealLogin = async () => {
    setIsLoading(true)
    try {
      // Redireciona o navegador para o Keycloak (Porta 8085)
      await auth.signinRedirect() 
    } catch (err) {
      console.error("Erro ao iniciar fluxo OIDC:", err)
      setIsLoading(false)
    }
  }

  // Se o OIDC estiver carregando estado inicial, mostra loading
  if (auth.isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm text-gray-400">Verificando credenciais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050505]">
      
      {/* --- BACKGROUND EFEITOS (Cosmic Theme) --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      {/* --- CARD DE LOGIN --- */}
      <Card className="w-[400px] bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl relative z-10 text-white">
        
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full border border-white/10 shadow-inner">
              <Atom className="w-10 h-10 text-blue-400 animate-spin-slow" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Logos Enterprise
          </CardTitle>
          <CardDescription className="text-gray-400">
            Acesso seguro à plataforma de inteligência.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-300 leading-relaxed">
              Para acessar sua Galáxia e Biblioteca, você será redirecionado para o nosso provedor de identidade corporativo.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-3 h-3 text-green-500" />
            <span>Conexão Segura via OIDC (Keycloak)</span>
          </div>
        </CardContent>
          
        <CardFooter className="pb-8">
          <Button 
            onClick={handleRealLogin} 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Conectando ao SSO...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Login com Keycloak
              </>
            )}
          </Button>
        </CardFooter>
      
      </Card>

      {/* Footer Branding */}
      <div className="absolute bottom-6 text-center text-[10px] text-gray-600">
        &copy; 2025 Logos System • Secured by Keycloak
      </div>
    </div>
  )
}