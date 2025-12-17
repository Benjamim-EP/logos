import { useState, useEffect } from "react" // Adicione useEffect
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Atom, Loader2, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom" // <--- IMPORTANTE: Importe isso

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/stores/authStore"

const loginSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated) // <--- Pegue o estado
  const [isLoading, setIsLoading] = useState(false)
  
  const navigate = useNavigate() // <--- HOOK DE NAVEGAÇÃO

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Se já estiver logado, redireciona automaticamente (UX Sênior)
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    // O mock do login retorna um ID fixo '1', mas vamos simular um ID de universo
    login(data.email) 
    
    setIsLoading(false)
    
    // CORREÇÃO: Redireciona para uma URL única baseada no usuário
    // Ex: /universe/user-1
    navigate("/universe/user-1") 
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050505]">
      
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      <Card className="w-[380px] bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl relative z-10 text-white">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/5 rounded-full border border-white/10">
              <Atom className="w-8 h-8 text-blue-400 animate-spin-slow" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acesso ao Logos</CardTitle>
          <CardDescription className="text-gray-400">
            Entre com suas credenciais para explorar o universo de conhecimento.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">E-mail</Label>
              <Input 
                id="email" 
                placeholder="seniordev@logos.ai" 
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-0"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                className="bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-0"
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Entrar na Galáxia
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}