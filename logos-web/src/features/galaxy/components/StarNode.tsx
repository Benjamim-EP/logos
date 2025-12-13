import type { Note } from "@/types/galaxy"
import { motion } from "framer-motion"
import { useSelectionStore } from "@/stores/selectionStore"

interface StarNodeProps {
  note: Note
  zoomLevel: number
}

export function StarNode({ note, zoomLevel }: StarNodeProps) {
  const setSelectedNote = useSelectionStore((state) => state.setSelectedNote)

  // LOD: Esconde se estiver muito longe (Zoom Out total) para limpar a visão
  if (zoomLevel < 0.25) return null

  // --- AJUSTE 1: Tamanho Menor ---
  // Reduzi o multiplicador de 12 para 6.
  // Elas ficarão mais delicadas de longe.
  const baseSize = (6 * note.z) / Math.pow(zoomLevel, 0.5)

  // --- AJUSTE 2: Brilho Dinâmico ---
  // O brilho agora depende do zoom.
  // Longe (Zoom < 1): Quase sem brilho (opacity 0.1)
  // Perto (Zoom > 2): Brilho mais forte
  const glowOpacity = zoomLevel > 1.5 ? 0.4 : 0.1
  const glowSize = zoomLevel > 1.5 ? 2 : 1

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedNote(note)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute rounded-full cursor-pointer group flex items-center justify-center"
      onClick={handleStarClick}
      style={{
        left: note.x,
        top: note.y,
        width: `${baseSize}px`,
        height: `${baseSize}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#FFFFFF',
        // --- AJUSTE 3: Sombra Suave ---
        // Usamos a opacidade dinâmica calculada acima.
        // Isso evita o "borrão branco" quando tem muitas juntas.
        boxShadow: `0 0 ${baseSize * glowSize}px ${baseSize * 0.5}px rgba(255, 255, 255, ${glowOpacity})`,
        zIndex: 20
      }}
      whileHover={{ 
        scale: 2.5, // Cresce mais no hover para facilitar o clique
        zIndex: 50,
        boxShadow: `0 0 ${baseSize * 4}px ${baseSize}px rgba(100, 200, 255, 0.6)` // Azul ao passar o mouse
      }}
    >
      {/* Tooltip Hover (Só aparece de perto) */}
      {zoomLevel > 0.8 && (
        <div 
          className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 origin-bottom"
          style={{ transform: `scale(${1 / zoomLevel})` }}
        >
          <div className="bg-black/90 backdrop-blur-md border border-white/20 px-3 py-2 rounded shadow-2xl whitespace-nowrap">
            <p className="font-bold text-blue-300 text-sm">{note.title}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}