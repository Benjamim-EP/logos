import { useState } from "react"
import { motion } from "framer-motion"
import { Check, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Predefinições Curadas (Estilos que combinam com o Logos)
const PRESETS = [
  // Robôs (Padrão do Sistema)
  "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Logos",
  "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Felix",
  "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Aneka",
  
  // Abstrato (Minimalista)
  "https://api.dicebear.com/9.x/shapes/svg?seed=Orbit",
  "https://api.dicebear.com/9.x/shapes/svg?seed=Nebula",
  "https://api.dicebear.com/9.x/shapes/svg?seed=Flux",

  // Humano (Estilo Notion)
  "https://api.dicebear.com/9.x/notionists/svg?seed=Leo",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Mila",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Zoe",
  
  // Aventureiro
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Sophie",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Max",
]

interface AvatarSelectorProps {
  currentAvatar?: string
  onSelect: (url: string) => void
}

export function AvatarSelector({ currentAvatar, onSelect }: AvatarSelectorProps) {
  const [selected, setSelected] = useState(currentAvatar)

  const handleSelect = (url: string) => {
    setSelected(url)
    onSelect(url)
  }

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <User className="w-4 h-4 text-purple-400" /> Escolha seu Personagem
      </h3>
      
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {PRESETS.map((url, i) => {
          const isSelected = selected === url
          
          return (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(url)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all",
                isSelected 
                  ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-blue-500/10" 
                  : "border-white/5 hover:border-white/20 bg-black/40"
              )}
            >
              <img src={url} alt="Avatar Preset" className="w-full h-full object-cover p-1" />
              
              {isSelected && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="bg-blue-500 rounded-full p-1">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}