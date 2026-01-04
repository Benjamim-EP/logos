import { useEffect, useState } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useAuthStore } from "@/stores/authStore"
import { useUserStore } from "@/stores/userStore"
import { AvatarSelector } from "./components/AvatarSelector"

import { motion } from "framer-motion"
import { 
  Key, Award, Zap, ArrowLeft, UploadCloud, 
  LogOut, Shield, Edit, Camera 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog" // Importando o Modal
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, ResponsiveContainer 
} from 'recharts'

// --- MOCK DATA ---
const KNOWLEDGE_DATA = [
  { subject: 'Java', A: 120, fullMark: 150 },
  { subject: 'Arquitetura', A: 98, fullMark: 150 },
  { subject: 'DevOps', A: 86, fullMark: 150 },
  { subject: 'IA/LLM', A: 99, fullMark: 150 },
  { subject: 'Teologia', A: 85, fullMark: 150 },
  { subject: 'História', A: 65, fullMark: 150 },
]

const RECENT_ACTIVITY = [
  { id: 1, action: "Upload", item: "Clean Architecture.pdf", time: "2 min atrás" },
  { id: 2, action: "Nota", item: "Conceitos de SOLID", time: "2 horas atrás" },
  { id: 3, action: "Leitura", item: "Attention Is All You Need", time: "5 horas atrás" },
]

export function ProfilePage() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  const { user, logout } = useAuthStore()
  const { profile, fetchProfile, updateAvatar, isLoading } = useUserStore()
  
  // Estado para controlar o modal
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleAvatarSelect = async (url: string) => {
    await updateAvatar(url)
    setIsAvatarModalOpen(false) // Fecha o modal após selecionar
  }

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
    // CORREÇÃO SCROLL: h-full ao invés de min-h-screen, e overflow-y-auto aqui
    <div className="h-full w-full bg-[#050505] text-white p-6 md:p-12 overflow-y-auto custom-scrollbar">
      
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => setViewMode('galaxy')}
          className="text-gray-400 hover:text-white pl-0 hover:bg-transparent group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar para Galáxia
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" className="border-red-900/30 text-red-500 hover:bg-red-950/30 hover:text-red-400" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
        </div>
      </div>

      <motion.div 
        className="max-w-6xl mx-auto space-y-8 pb-20" // Padding bottom extra para não cortar conteúdo
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* REMOVIDO A SEÇÃO DE PERSONALIZAÇÃO QUE FICAVA AQUI EM CIMA */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 2.1 CARD IDENTIDADE (Esquerda) */}
            <motion.div variants={itemVariants} className="md:col-span-1 space-y-6">
            
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20">
                        <Shield className="w-24 h-24 text-blue-500" />
                    </div>
                    
                    <div className="flex flex-col items-center text-center relative z-10">
                    
                    {/* --- ÁREA DO AVATAR COM MODAL --- */}
                    <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                      <DialogTrigger asChild>
                        <div className="relative mb-4 group cursor-pointer">
                            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                            
                            <Avatar className="w-32 h-32 border-4 border-white/10 bg-black shadow-2xl transition-transform group-hover:scale-105">
                                <AvatarImage src={profile?.avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-2xl font-bold bg-zinc-800 text-zinc-400">
                                    {user?.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            {/* Overlay de Edição (Aparece no Hover) */}
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
                      
                      {/* CONTEÚDO DO MODAL */}
                      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5 text-blue-400" /> Personalizar Aparência
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                           {/* O SELETOR AGORA VIVE AQUI DENTRO */}
                           <AvatarSelector 
                              currentAvatar={profile?.avatarUrl} 
                              onSelect={handleAvatarSelect} 
                           />
                        </div>
                      </DialogContent>
                    </Dialog>
                    {/* -------------------------------- */}
                    
                    <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                        {user?.name || "Explorador"}
                    </h2>
                    <p className="text-blue-400 text-sm font-medium mb-3">{profile?.bio || "Novo Membro da Galáxia"}</p>
                    
                    <div className="flex gap-2 mb-6 justify-center">
                        <Badge variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20">Lvl. 42</Badge>
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30">Pro</Badge>
                    </div>

                    <div className="w-full bg-black/40 rounded-xl p-4 text-xs text-gray-400 text-left space-y-2 border border-white/5">
                        <div className="flex justify-between">
                            <span>Membros</span>
                            <span className="text-white">124</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Conexões</span>
                            <span className="text-white">850</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Rank Global</span>
                            <span className="text-green-400">#402</span>
                        </div>
                    </div>
                    </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h3 className="flex items-center gap-2 font-semibold mb-4 text-gray-200">
                        <Key className="w-4 h-4 text-yellow-500" /> Chaves de Acesso
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-500">OpenAI API Key</Label>
                            <div className="flex gap-2">
                                <Input type="password" value="sk-................" className="bg-black/50 border-white/10 h-8 text-xs font-mono text-green-500" readOnly />
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Zap className="w-3 h-3" /></Button>
                            </div>
                        </div>
                    </div>
                </div>

            </motion.div>

            {/* 2.2 CARD DASHBOARD (Centro/Direita) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                
                <motion.div variants={itemVariants} className="md:col-span-2 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-h-[300px] flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 className="font-bold text-lg">Radar de Conhecimento</h3>
                            <p className="text-xs text-gray-500">Análise vetorial dos seus clusters</p>
                        </div>
                        <Award className="w-5 h-5 text-purple-500" />
                    </div>
                    
                    <div className="flex-1 w-full h-[250px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={KNOWLEDGE_DATA}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                                <Radar
                                    name="Skills"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="#8b5cf6"
                                    fillOpacity={0.3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                        <Zap className="w-3 h-3 text-yellow-400" /> Atividade Recente
                    </h3>
                    
                    <div className="space-y-4">
                        {RECENT_ACTIVITY.map(act => (
                            <div key={act.id} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                                    {act.action === 'Upload' ? <UploadCloud className="w-3 h-3 text-blue-400" /> : <Edit className="w-3 h-3 text-purple-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-gray-300">{act.item}</p>
                                    <p className="text-[10px] text-gray-600">{act.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

        </div>

      </motion.div>
    </div>
  )
}