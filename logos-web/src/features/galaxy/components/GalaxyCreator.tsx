// #logos-web/src/features/galaxy/components/GalaxyCreator.tsx

import { useState } from "react"
import { Sparkles, Loader2, Plus, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { motion, AnimatePresence } from "framer-motion"

export function GalaxyCreator() {
  const { createGalaxy, isGravityLoading } = useGalaxyStore()
  const [term, setTerm] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!term.trim()) return

    // Define uma posição inicial para a nova galáxia.
    // Usamos um offset aleatório para que elas não nasçam todas empilhadas no centro (0,0).
    // O usuário poderá arrastar depois (futura feature de Drag & Drop).
    const randomX = (Math.random() - 0.5) * 1500;
    const randomY = (Math.random() - 0.5) * 1500;

    await createGalaxy(term, randomX, randomY)
    
    setTerm("") // Limpa o input
    // Mantemos expandido para facilitar criar várias em sequência (Flow State)
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      
      {/* INPUT FLUTUANTE EXPANSÍVEL */}
      <AnimatePresence>
        {isExpanded && (
          <motion.form
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onSubmit={handleSubmit}
            className="flex items-center gap-2 bg-black/80 backdrop-blur-xl p-2 rounded-full border border-white/20 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
          >
            <div className="pl-3">
               <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            
            <Input 
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Nome da Galáxia (ex: Java, História)"
                className="bg-transparent border-0 focus-visible:ring-0 text-white w-64 placeholder:text-gray-500 focus:placeholder:text-gray-700 transition-colors"
                disabled={isGravityLoading}
            />
            
            <Button 
                type="submit" 
                size="icon" 
                disabled={isGravityLoading || !term.trim()}
                className="rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-transform active:scale-95"
            >
                {isGravityLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Plus className="w-4 h-4" />
                )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* BOTÃO PRINCIPAL (GATILHO) */}
      {!isExpanded && (
          <Button
            onClick={() => setIsExpanded(true)}
            size="lg"
            className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20 h-12 px-6 gap-2 transition-transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            Criar Nova Galáxia
          </Button>
      )}
      
      {/* BOTÃO FECHAR */}
      {isExpanded && (
        <button 
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-[10px] text-gray-500 hover:text-white mt-2 uppercase tracking-widest hover:underline transition-all"
        >
            Fechar painel
        </button>
      )}
    </div>
  )
}