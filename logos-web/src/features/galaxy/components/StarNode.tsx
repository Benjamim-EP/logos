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
import { BookOpen,Sparkles } from "lucide-react"
import { stringToColor } from "@/lib/colors"

interface StarNodeProps {
  note: Note
  zoomLevel: number
}

export const StarNode = React.memo(function StarNode({ note, zoomLevel }: StarNodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // LOD: Otimização de Performance
  if (zoomLevel < 0.05) return null

  // 1. Detectar se é Resumo (AI Summary)
  // O backend manda "type": "RESUME", que o store mapeia para as tags
  const isResume = note.tags?.includes("RESUME") || note.tags?.includes("resume");

  // 2. Definir Cor
  // Se for resumo: Ciano (Brilhante). Se for nota normal: Cor do Livro.
  const starColor = isResume 
    ? '#06b6d4' // Ciano 500
    : stringToColor(note.documentId || note.id, 0.8)
  
  // 3. Tamanho (Resumos podem ser levemente maiores)
  const baseSize = ((isResume ? 14 : 10) * (note.z || 1)) / Math.pow(zoomLevel, 0.2) 
  
  const showGlow = zoomLevel > 1.5 || isHovered || isResume

  // Ação: Explorar (Se tiver posição, abre lá. Se for resumo, talvez abra o card)
  const handleExplore = () => {
    window.dispatchEvent(new CustomEvent('open-book-reader', { 
        detail: { 
            documentId: note.documentId, 
            noteId: note.id,
            position: note.position 
        } 
    }))
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
            zIndex: isOpen || isHovered ? 60 : (isResume ? 20 : 10)
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- ANEL DE RESUMO (O Diferencial Visual) --- */}
          {isResume && (
             <>
                {/* Anel Pulsante */}
                <div 
                    className="absolute inset-[-60%] rounded-full border border-cyan-500/60 animate-pulse pointer-events-none"
                    style={{ animationDuration: '3s' }}
                />
                {/* Anel Estático */}
                <div className="absolute inset-[-30%] rounded-full border border-cyan-300/30 pointer-events-none" />
             </>
          )}

          {/* O Corpo da Estrela */}
          <motion.div
            initial={false}
            animate={{ 
                scale: isHovered ? 1.8 : 1,
                backgroundColor: isHovered ? '#ffffff' : starColor
            }}
            transition={{ duration: 0.2 }}
            className="rounded-full w-full h-full"
            style={{
                boxShadow: showGlow 
                    ? `0 0 ${baseSize * (isResume ? 4 : 3)}px ${starColor}` 
                    : 'none'
            }}
          />

          {/* Tooltip */}
          {isHovered && zoomLevel > 0.15 && (
            <div 
                className="absolute top-full mt-3 bg-zinc-950/90 border border-white/10 px-3 py-2 rounded-lg text-xs text-white z-[100] pointer-events-none shadow-2xl backdrop-blur-md min-w-[150px] max-w-[250px]"
            >
                <div className="flex items-center gap-1 mb-1">
                    {isResume && <Sparkles className="w-3 h-3 text-cyan-400" />}
                    <p className="font-bold text-blue-300 truncate block">
                        {isResume ? "Resumo IA" : note.title}
                    </p>
                </div>
                {note.preview && (
                    <p className="text-zinc-400 italic line-clamp-3 leading-relaxed">
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
        <DropdownMenuLabel className="truncate text-xs text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-2">
            {isResume && <Sparkles className="w-3 h-3 text-cyan-500" />}
            {isResume ? "IA Summary" : "Anotação"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        
        {/* Só mostra 'Explorar Contexto' se tiver um documento vinculado */}
        {note.documentId && (
            <DropdownMenuItem onClick={handleExplore} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 py-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>{isResume ? "Ver Documento Fonte" : "Explorar Contexto"}</span>
            </DropdownMenuItem>
        )}

        {/* <DropdownMenuItem onClick={handleCentralize} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 py-2">
            <Crosshair className="w-4 h-4 text-purple-400" />
            <span>Centralizar</span>
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})