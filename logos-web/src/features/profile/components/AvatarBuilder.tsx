import { useState } from "react"
import { motion } from "framer-motion"
import { Dices, Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"

// Estilos disponíveis na DiceBear (v9)
const STYLES = [
  { id: "bottts-neutral", name: "Robô (Logos)", icon: "🤖" },
  { id: "notionists", name: "Notion Style", icon: "🎨" },
  { id: "adventurer", name: "Aventureiro", icon: "🎒" },
  { id: "lorelei", name: "Digital Art", icon: "✨" },
  { id: "shapes", name: "Abstrato", icon: "🔷" },
  { id: "identicon", name: "Identidade", icon: "🆔" },
]

interface AvatarBuilderProps {
  initialSeed?: string
  initialStyle?: string
  onSave: (avatarUrl: string) => void
}

export function AvatarBuilder({ initialSeed = "user", initialStyle = "bottts-neutral", onSave }: AvatarBuilderProps) {
  const [seed, setSeed] = useState(initialSeed)
  const [style, setStyle] = useState(initialStyle)
  const [backgroundColor] = useState("transparent")
  const [isLoading, setIsLoading] = useState(false)

  // Gera a URL da DiceBear
  const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=${backgroundColor}`

  const handleRandomize = () => {
    setSeed(Math.random().toString(36).substring(7))
  }

  const handleSave = () => {
    setIsLoading(true)
    // Simula delay de rede
    setTimeout(() => {
        onSave(avatarUrl)
        toast.success("Avatar atualizado com sucesso!")
        setIsLoading(false)
    }, 800)
  }

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center">
      
      {/* PREVIEW DO AVATAR */}
      <div className="relative group">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
        <motion.div 
            key={avatarUrl} // Força animação quando muda
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-40 h-40 rounded-full border-4 border-white/10 bg-black overflow-hidden shadow-2xl"
        >
            <img 
                src={avatarUrl} 
                alt="Avatar Preview" 
                className="w-full h-full object-cover"
            />
        </motion.div>
        
        <Button 
            size="icon" 
            variant="secondary" 
            className="absolute bottom-0 right-0 rounded-full shadow-lg"
            onClick={handleRandomize}
        >
            <Dices className="w-4 h-4" />
        </Button>
      </div>

      {/* CONTROLES */}
      <div className="flex-1 w-full space-y-4">
        <div className="space-y-2">
            <Label>Estilo do Personagem</Label>
            <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {STYLES.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                            <span className="mr-2">{s.icon}</span> {s.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-2">
            <Label>Semente (Nome ou Código)</Label>
            <div className="flex gap-2">
                <Input 
                    value={seed} 
                    onChange={(e) => setSeed(e.target.value)}
                    className="bg-white/5 border-white/10 font-mono"
                />
                <Button variant="ghost" onClick={handleRandomize}>
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white min-w-[120px]"
            >
                {isLoading ? (
                    "Salvando..."
                ) : (
                    <> <Save className="w-4 h-4 mr-2" /> Salvar Avatar </>
                )}
            </Button>
        </div>
      </div>

    </div>
  )
}