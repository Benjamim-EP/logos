import type { Note } from "@/types/galaxy"
import { motion } from "framer-motion"
import { useSelectionStore } from "@/stores/selectionStore"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { BookOpen, Network, MousePointer2 } from "lucide-react"
import { useState } from "react"

interface StarNodeProps {
  note: Note
  zoomLevel: number
}

export function StarNode({ note, zoomLevel }: StarNodeProps) {
  const setSelectedNote = useSelectionStore((state) => state.setSelectedNote)
  const setFocusNode = useGalaxyStore((state) => state.setFocusNode)
  const [isOpen, setIsOpen] = useState(false)

  // LOD: Performance
  if (zoomLevel < 0.25) return null

  // Cálculos visuais
  const baseSize = (6 * note.z) / Math.pow(zoomLevel, 0.5)
  const glowOpacity = zoomLevel > 1.5 ? 0.4 : 0.1
  const glowSize = zoomLevel > 1.5 ? 2 : 1

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      {/* 
         TRIGGER: A Estrela em si.
         Usamos asChild para que o Dropdown não crie um botão extra, 
         mas use nossa motion.div como gatilho.
      */}
      <DropdownMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-full cursor-pointer flex items-center justify-center outline-none"
          style={{
            left: note.x,
            top: note.y,
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: isOpen ? '#A855F7' : '#FFFFFF', // Fica roxa quando o menu tá aberto
            boxShadow: `0 0 ${baseSize * glowSize}px ${baseSize * 0.5}px rgba(255, 255, 255, ${glowOpacity})`,
            zIndex: isOpen ? 60 : 20 // Traz pra frente se o menu estiver aberto
          }}
          whileHover={{ 
            scale: 2.5, 
            zIndex: 50,
            boxShadow: `0 0 ${baseSize * 4}px ${baseSize}px rgba(100, 200, 255, 0.6)`
          }}
          // Importante: Parar a propagação para não arrastar o canvas ao clicar
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()} 
        >
          {/* Tooltip simples (Só aparece se o menu NÃO estiver aberto) */}
          {zoomLevel > 0.8 && !isOpen && (
            <div 
              className="absolute bottom-full mb-4 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none origin-bottom"
              style={{ transform: `scale(${1 / zoomLevel})` }}
            >
              <div className="bg-black/90 backdrop-blur-md border border-white/20 px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap">
                <p className="font-bold text-blue-300 text-sm">{note.title}</p>
              </div>
            </div>
          )}
        </motion.div>
      </DropdownMenuTrigger>

      {/* O MENU FLUTUANTE */}
      <DropdownMenuContent 
        className="bg-black/90 border-white/20 text-white backdrop-blur-xl w-56 z-[100]" 
        sideOffset={10}
        // Impede que o scroll do mouse dê zoom no canvas enquanto o menu tá aberto
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="truncate text-blue-300">
          {note.title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        
        {/* Opção 1: Ler */}
        <DropdownMenuItem 
          className="cursor-pointer focus:bg-white/10 focus:text-white group"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedNote(note)
          }}
        >
          <BookOpen className="mr-2 h-4 w-4 text-green-400 group-hover:scale-110 transition-transform" />
          <span>Ler Anotação</span>
        </DropdownMenuItem>

        {/* Opção 2: Constelação */}
        <DropdownMenuItem 
          className="cursor-pointer focus:bg-white/10 focus:text-white group"
          onClick={(e) => {
            e.stopPropagation()
            setFocusNode(note)
          }}
        >
          <Network className="mr-2 h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
          <span>Explorar Conexões</span>
        </DropdownMenuItem>

        {/* Opção 3: Selecionar (Extra) */}
        <DropdownMenuItem disabled className="text-gray-500">
          <MousePointer2 className="mr-2 h-4 w-4" />
          <span>Centralizar (Em breve)</span>
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}