import { useState, useEffect } from "react"
import { useAuth } from "react-oidc-context"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  Atom, 
  Loader2, 
  ShieldCheck, 
  Globe, 
  Mail, 
  ArrowRight, 
  CheckCircle2 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState<"google" | "standard" | null>(null)

  // Redireciona automaticamente se já estiver autenticado
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate("/")
    }
  }, [auth.isAuthenticated, navigate])

  // --- ESTRATÉGIA 1: DIRECT IDENTITY BROKERING ---
  // O parâmetro 'kc_idp_hint: google' diz ao Keycloak:
  // "Não mostre sua tela de login, mande o usuário direto para o Google."
  const handleGoogleLogin = async () => {
    setIsLoading("google")
    try {
      await auth.signinRedirect({
        extraQueryParams: {
          kc_idp_hint: "google" 
        }
      })
    } catch (err) {
      console.error("Erro ao iniciar login Google:", err)
      setIsLoading(null)
    }
  }

  // --- ESTRATÉGIA 2: STANDARD FLOW ---
  // Leva para a tela do Keycloak onde o usuário pode:
  // 1. Digitar E-mail/Senha
  // 2. Clicar em "Register" (Criar conta)
  // 3. Clicar em "Forgot Password"
  const handleStandardLogin = async () => {
    setIsLoading("standard")
    try {
      await auth.signinRedirect() 
    } catch (err) {
      console.error("Erro ao iniciar login padrão:", err)
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#050505]">
      
      {/* --- BACKGROUND DINÂMICO --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      {/* Orbes de Luz */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />

      {/* --- COLUNA ESQUERDA (Branding) --- */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative z-10 border-r border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="Logos" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          <span className="font-bold text-2xl tracking-tight text-white font-sans">LOGOS</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            Organize seu conhecimento com Inteligência Artificial.
          </h1>
          <p className="text-lg text-gray-400 max-w-md leading-relaxed">
            Uma arquitetura Cloud-Native distribuída para ingestão, processamento e conexão semântica de dados.
          </p>
          
          <div className="flex gap-4 pt-4">
             <FeatureBadge icon={Globe} text="Cloud Native" />
             <FeatureBadge icon={ShieldCheck} text="Secure Identity" />
          </div>
        </div>

        <div className="text-xs text-gray-600 font-mono">
          v2.0.0 • Powered by Google Cloud Run & Neon
        </div>
      </div>

      {/* --- COLUNA DIREITA (Formulário) --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-20">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Header Mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo-icon.png" alt="Logos" className="w-16 h-16 animate-pulse-slow" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">Bem-vindo de volta</h2>
            <p className="text-sm text-gray-400">
              Acesse sua galáxia pessoal de documentos.
            </p>
          </div>

          <div className="space-y-4">
            {/* BOTÃO GOOGLE (Destaque) */}
            <Button 
              onClick={handleGoogleLogin} 
              disabled={!!isLoading}
              className="w-full h-12 bg-white text-black hover:bg-gray-200 font-semibold text-base transition-transform active:scale-95 flex items-center justify-center gap-3"
            >
              {isLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continuar com Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#050505] px-2 text-gray-500">ou entre com e-mail</span>
              </div>
            </div>

            {/* BOTÃO E-MAIL (Secundário) */}
            <Button 
              onClick={handleStandardLogin} 
              disabled={!!isLoading}
              variant="outline"
              className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-gray-300 font-normal justify-between group"
            >
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Usar e-mail e senha
              </span>
              {isLoading === 'standard' ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                 <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
              )}
            </Button>
          </div>

          {/* Footer de Registro */}
          <div className="text-center text-sm text-gray-500 mt-6">
            Não tem uma conta?{" "}
            <button 
                onClick={handleStandardLogin} // O mesmo link leva para a tela onde tem "Register"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
            >
              Criar conta agora
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  )
}

function FeatureBadge({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
            <Icon className="w-3.5 h-3.5 text-blue-400" />
            {text}
        </div>
    )
}