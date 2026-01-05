import { useEffect, useState } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useAuthStore } from "@/stores/authStore"
import { useUserStore } from "@/stores/userStore"
import { AvatarSelector } from "./components/AvatarSelector"

import { motion } from "framer-motion"
import { 
  Award, ArrowLeft, 
  LogOut, Shield, Edit, Camera,
  FileText, Sparkles, Network,
  Info, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, ResponsiveContainer 
} from 'recharts'

export function ProfilePage() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  const { user, logout } = useAuthStore()
  const { profile, fetchProfile, updateAvatar, isLoading } = useUserStore()
  
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  // Sincroniza com o backend ao carregar
  useEffect(() => {
    fetchProfile()
  }, [])

  const handleAvatarSelect = async (url: string) => {
    await updateAvatar(url)
    setIsAvatarModalOpen(false)
  }

  // Animações Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    // h-full + overflow-y-auto resolve o problema da rolagem
    <div className="h-full w-full bg-[#050505] text-white p-6 md:p-12 overflow-y-auto custom-scrollbar">
      
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="max-w-6xl mx-auto mb-10 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => setViewMode('galaxy')}
          className="text-gray-400 hover:text-white pl-0 hover:bg-transparent group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar para Galáxia
        </Button>
        <Button 
            variant="outline" 
            className="border-red-900/30 text-red-500 hover:bg-red-950/30 hover:text-red-400 transition-all" 
            onClick={logout}
        >
            <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
        </Button>
      </div>

      <motion.div 
        className="max-w-6xl mx-auto space-y-8 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* --- COLUNA 1: PERFIL E ESTATÍSTICAS --- */}
            <motion.div variants={itemVariants} className="md:col-span-1 space-y-6">
            
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="flex flex-col items-center text-center relative z-10">
                        
                        {/* AVATAR COM TRIGGER DE MODAL */}
                        <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                            <DialogTrigger asChild>
                                <div className="relative mb-6 group cursor-pointer">
                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                                    
                                    <Avatar className="w-32 h-32 border-4 border-white/10 bg-black shadow-2xl transition-transform group-hover:scale-105 duration-300">
                                        <AvatarImage src={profile?.avatarUrl} className="object-cover" />
                                        <AvatarFallback className="text-2xl font-bold bg-zinc-800 text-zinc-400">
                                            {user?.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Overlay de Edição no Hover */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>

                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-[#0a0a0a]"></div>
                                </div>
                            </DialogTrigger>
                            
                            <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-[600px] shadow-[0_0_50px_rgba(0,0,0,1)]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl">
                                        <Edit className="w-5 h-5 text-blue-400" /> Identidade Visual
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                    <AvatarSelector 
                                        currentAvatar={profile?.avatarUrl} 
                                        onSelect={handleAvatarSelect} 
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                        
                        <h2 className="text-2xl font-bold tracking-tight mb-1 truncate w-full">{user?.name || "Explorador"}</h2>
                        <p className="text-zinc-500 text-sm font-medium mb-6 italic">"{profile?.bio || "Mapeando o conhecimento..."}"</p>
                        
                        <div className="flex gap-2 mb-8">
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Explorador</Badge>
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Beta User</Badge>
                        </div>

                        {/* ESTATÍSTICAS REAIS */}
                        <div className="w-full bg-black/40 rounded-2xl p-5 text-xs text-gray-400 text-left space-y-4 border border-white/5 shadow-inner">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 uppercase tracking-widest font-bold text-[9px]">
                                    <FileText className="w-3.5 h-3.5 text-blue-400" /> Marcações
                                </span>
                                <span className="text-white font-mono text-base">{profile?.stats?.highlights || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 uppercase tracking-widest font-bold text-[9px]">
                                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Resumos IA
                                </span>
                                <span className="text-cyan-400 font-mono text-base">{profile?.stats?.summaries || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 uppercase tracking-widest font-bold text-[9px]">
                                    <Network className="w-3.5 h-3.5 text-purple-400" /> Conexões
                                </span>
                                <span className="text-purple-400 font-mono text-base">{profile?.stats?.connections || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INFO BOX */}
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex gap-4 items-start shadow-lg">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Seu Radar de Conhecimento é recalibrado automaticamente a cada 30 novas interações processadas pela rede neural Logos.
                    </p>
                </div>
            </motion.div>

            {/* --- COLUNA 2: RADAR DE CONHECIMENTO --- */}
            <div className="md:col-span-2 space-y-6">
                
                <motion.div 
                    variants={itemVariants} 
                    className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-[520px] flex flex-col relative overflow-hidden shadow-2xl"
                >
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="font-bold text-xl tracking-tight">Eixos de Conhecimento</h3>
                            <p className="text-sm text-gray-500 font-medium">Análise vetorial do seu perfil cognitivo</p>
                        </div>
                        <Award className="w-6 h-6 text-purple-500 animate-pulse" />
                    </div>
                    
                    {/* CONTAINER DO GRÁFICO COM TAMANHO EXPLÍCITO */}
                    <div className="flex-1 w-full flex items-center justify-center min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={profile?.radar}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis 
                                    dataKey="subject" 
                                    tick={{ fill: '#888', fontSize: 10, fontWeight: 'bold' }} 
                                />
                                <Radar
                                    name="Nível"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="#8b5cf6"
                                    fillOpacity={0.5}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Background decorativo do Radar */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                </motion.div>

                {/* STATUS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl hover:bg-zinc-900/50 transition-colors shadow-lg">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                           <Clock className="w-3 h-3" /> Próxima Evolução
                        </h4>
                        <p className="text-sm text-zinc-300">
                           {profile?.stats ? (30 - (profile.stats.highlights % 30)) : 30} marcações restantes para novo mapeamento.
                        </p>
                     </div>
                     <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl flex items-center justify-between shadow-lg">
                        <div>
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Status da Rede</h4>
                            <p className="text-sm text-green-500 font-medium">Sincronizado via Confluent</p>
                        </div>
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
                     </div>
                </div>
            </div>

        </div>

      </motion.div>
    </div>
  )
}