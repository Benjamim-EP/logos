import React, { useState } from "react"
import type { Note } from "@/types/galaxy"
import { motion } from "framer-motion"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { BookOpen, Crosshair } from "lucide-react"
import { stringToColor } from "@/lib/colors"
import { useGalaxyStore } from "@/stores/galaxyStore"

interface StarNodeProps {
  note: Note
  zoomLevel: number
}

// OTIMIZAÇÃO: React.memo evita re-renderizar milhares de estrelas se elas não mudaram
export const StarNode = React.memo(function StarNode({ note, zoomLevel }: StarNodeProps) {
  const { centralizeNode } = useGalaxyStore()
  
  // Estado local para hover e menu
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 1. LOD (Level of Detail): Otimização de RAM/GPU
  // Se o zoom estiver muito longe (< 0.15), não renderiza a estrela (culling)
  if (zoomLevel < 0.15) return null

  // 2. Cor Consistente por Documento
  // Usa o ID do documento para gerar a cor. Se não tiver documento, usa o ID da nota.
  // Opacidade de 0.8 para não ficar "gritante"
  const starColor = stringToColor(note.documentId || note.id, 0.8)
  
  // 3. Tamanho Dinâmico
  // Aumenta ligeiramente quando o zoom aproxima, mas mantém proporção
  const baseSize = (5 * (note.z || 1)) / Math.pow(zoomLevel, 0.3)
  
  // 4. Performance Visual
  // Só renderiza sombras pesadas (Glow) se estiver focado ou com zoom muito perto
  const showGlow = zoomLevel > 1.5 || isHovered

  // Ação: Explorar Contexto (Dispara evento para o GalaxyCanvas abrir o PDF)
  const handleExplore = () => {
    // Passamos a posição junto com o ID
    window.dispatchEvent(new CustomEvent('open-book-reader', { 
        detail: { 
            documentId: note.documentId, 
            noteId: note.id,
            position: note.position // <--- Envia a posição
        } 
    }))
  }

  // Ação: Centralizar (Gravidade Temporária)
  const handleCentralize = () => {
    centralizeNode(note)
  }

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div
          className="absolute flex items-center justify-center cursor-pointer will-change-transform"
          style={{
            left: note.x,
            top: note.y,
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: isOpen || isHovered ? 60 : 10 // Traz para frente no hover
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          // Impede que o clique na estrela arraste o canvas
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* O Corpo Visual da Estrela */}
          <motion.div
            initial={false}
            animate={{ 
                scale: isHovered ? 1.8 : 1,
                backgroundColor: isHovered ? '#ffffff' : starColor
            }}
            transition={{ duration: 0.2 }}
            className="rounded-full w-full h-full"
            style={{
                boxShadow: showGlow ? `0 0 ${baseSize * 3}px ${starColor}` : 'none'
            }}
          />

          {/* Tooltip Leve (Só aparece no Hover e se o zoom permitir leitura) */}
          {isHovered && zoomLevel > 0.4 && (
            <div 
                className="absolute top-full mt-3 bg-zinc-950/90 border border-white/10 px-3 py-2 rounded-lg text-xs text-white z-[100] pointer-events-none shadow-2xl backdrop-blur-md min-w-[150px] max-w-[250px]"
            >
                <p className="font-bold text-blue-300 mb-1 truncate block">{note.title}</p>
                {note.preview && (
                    <p className="text-zinc-400 italic line-clamp-2 leading-relaxed">
                        "{note.preview}"
                    </p>
                )}
            </div>
          )}
        </div>
      </DropdownMenuTrigger>

      {/* Menu Contextual */}
      <DropdownMenuContent 
        className="bg-black/90 border-white/10 text-white w-56 backdrop-blur-xl z-[200]"
        sideOffset={5}
      >
        <DropdownMenuLabel className="truncate text-xs text-zinc-500 font-mono uppercase tracking-widest">
            Opções do Nó
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        
        <DropdownMenuItem onClick={handleExplore} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 py-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Explorar Contexto</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCentralize} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 py-2">
            <Crosshair className="w-4 h-4 text-purple-400" />
            <span>Centralizar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})