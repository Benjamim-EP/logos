import type { Note } from "@/types/galaxy"
import { motion } from "framer-motion"

interface StarNodeProps {
  note: Note
  zoomLevel: number
}

export function StarNode({ note, zoomLevel }: StarNodeProps) {
  // LOD: Se estiver muito longe, não renderiza para economizar GPU
  if (zoomLevel < 0.2) return null

  // --- FÓRMULA MÁGICA DE ESCALA ---
  // Tamanho Base: Multiplicamos pelo Z (importância da nota)
  // Divisor: Usamos Math.pow(zoomLevel, 0.7).
  // Isso significa: Quando o zoom aumenta, a estrela cresce, mas MENOS que o resto do universo.
  // Isso cria a ilusão de que ela é um ponto de luz distante e não um objeto físico crescendo.
  const size = (12 * note.z) / Math.pow(zoomLevel, 0.7)

  // Opacidade do texto (só aparece quando chega perto)
  const showText = zoomLevel > 1.8

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute rounded-full cursor-pointer group flex items-center justify-center"
      style={{
        left: note.x,
        top: note.y,
        width: `${size}px`,
        height: `${size}px`,
        // Centraliza o elemento na coordenada exata
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#FFFFFF',
        // Glow (Brilho) dinâmico
        boxShadow: `0 0 ${size * 1.5}px ${size * 0.5}px rgba(255, 255, 255, 0.6)`,
        zIndex: 20
      }}
      whileHover={{ 
        scale: 1.5, 
        zIndex: 50,
        boxShadow: `0 0 ${size * 3}px ${size}px rgba(100, 200, 255, 0.8)` // Brilho azul ao passar o mouse
      }}
    >
      {/* Tooltip Hover (Sempre disponível no hover) */}
      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-black/80 backdrop-blur-md border border-white/20 px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap shadow-2xl">
          <p className="font-bold text-blue-300 text-sm">{note.title}</p>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider">{note.tags[0]}</p>
        </div>
      </div>

      {/* Label Permanente (Só aparece com muito zoom) */}
      {showText && (
        <div 
          className="absolute top-full mt-2 text-[4px] text-white/50 pointer-events-none whitespace-nowrap text-center font-mono"
          style={{ fontSize: `${12 / zoomLevel}px` }} // O texto mantém tamanho legível
        >
          {note.title.substring(0, 15)}...
        </div>
      )}
    </motion.div>
  )
}