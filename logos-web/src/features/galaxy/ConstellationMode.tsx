import { useEffect, useState, useMemo } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useSelectionStore } from "@/stores/selectionStore"
import { getNearestNotes } from "@/lib/math"
import { motion } from "framer-motion"
import { ArrowLeft, ScanSearch, Network } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ConstellationMode() {
  const { focusNode, setFocusNode, notes } = useGalaxyStore()
  const { setSelectedNote } = useSelectionStore()
  const [isScanning, setIsScanning] = useState(true)

  // 1. Calcula vizinhos (Top 15 mais próximos)
  const neighbors = useMemo(() => {
    if (!focusNode) return []
    return getNearestNotes(focusNode, notes, 15)
  }, [focusNode, notes])

  // 2. Simula o "Scan" da IA
  useEffect(() => {
    setIsScanning(true)
    const timer = setTimeout(() => setIsScanning(false), 1500)
    return () => clearTimeout(timer)
  }, [focusNode])

  if (!focusNode) return null

  // Função para calcular posição relativa na tela (Centralizado)
  // O focusNode fica no (0,0) da tela. Os outros ficam relativos.
  const getRelativePos = (noteX: number, noteY: number) => {
    const screenX = window.innerWidth / 2 + (noteX - focusNode.x) * 1.5 // 1.5x zoom factor
    const screenY = window.innerHeight / 2 + (noteY - focusNode.y) * 1.5
    return { x: screenX, y: screenY }
  }

  const centerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
      
      {/* Botão Voltar */}
      <div className="absolute top-6 left-6 z-50">
        <Button 
          variant="outline" 
          onClick={() => setFocusNode(null)}
          className="border-purple-500 text-purple-400 hover:bg-purple-900/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Galáxia
        </Button>
      </div>

      {/* Título do Modo */}
      <div className="absolute top-6 right-6 z-50 text-right">
        <h2 className="text-2xl font-bold text-white flex items-center justify-end gap-2">
          <Network className="text-blue-500" /> Deep Dive
        </h2>
        <p className="text-gray-400 text-sm">Explorando conexões semânticas</p>
      </div>

      {/* --- CANVAS DA CONSTELAÇÃO --- */}
      <div className="relative w-full h-full">
        
        {/* Efeito de Radar (Enquanto escaneia) */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{ width: "100vw", height: "100vw", opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="rounded-full border border-blue-500/50 bg-blue-500/5"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-20 text-blue-400 animate-pulse flex items-center gap-2">
              <ScanSearch className="w-4 h-4" /> Calculando vetores de proximidade...
            </div>
          </div>
        )}

        {/* Linhas de Conexão (Só aparecem depois do scan) */}
        {!isScanning && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {neighbors.map((n, i) => {
              const pos = getRelativePos(n.x, n.y)
              return (
                <motion.line
                  key={`line-${n.id}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  x1={centerPos.x}
                  y1={centerPos.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="white"
                  strokeWidth="1"
                />
              )
            })}
          </svg>
        )}

        {/* NÓ CENTRAL (O Sol deste sistema) */}
        <motion.div
          layoutId={`star-${focusNode.id}`} // Animação mágica de transição (se configurado)
          className="absolute w-16 h-16 bg-white rounded-full shadow-[0_0_60px_20px_rgba(59,130,246,0.6)] z-20 flex items-center justify-center cursor-pointer"
          style={{ left: centerPos.x, top: centerPos.y, transform: 'translate(-50%, -50%)' }}
          onClick={() => setSelectedNote(focusNode)}
        >
          <div className="absolute -bottom-8 text-center w-60">
            <p className="text-white font-bold text-lg text-shadow-glow">{focusNode.title}</p>
          </div>
        </motion.div>

        {/* VIZINHOS (Os Planetas) */}
        {!isScanning && neighbors.map((note, i) => {
          const pos = getRelativePos(note.x, note.y)
          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring" }}
              className="absolute w-6 h-6 bg-gray-200 rounded-full shadow-[0_0_20px_5px_rgba(255,255,255,0.3)] z-10 cursor-pointer hover:bg-blue-400 hover:scale-150 transition-all"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              onClick={() => setSelectedNote(note)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setFocusNode(note) // Deep Dive recursivo! Navegar de vizinho em vizinho
              }}
            >
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-40 text-center opacity-70 hover:opacity-100">
                <p className="text-xs text-gray-300 truncate">{note.title}</p>
                <p className="text-[10px] text-blue-400/80">{Math.round(note.distance || 0)}u dist</p>
              </div>
            </motion.div>
          )
        })}

      </div>
    </div>
  )
}