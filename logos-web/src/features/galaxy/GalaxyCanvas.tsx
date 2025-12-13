import { useEffect } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { Loader2, MousePointer2, ZoomIn } from "lucide-react"

export function GalaxyCanvas() {
  const { notes, clusters, initializeGalaxy, isLoading } = useGalaxyStore()
  
  // Hook customizado que contém a lógica do D3.js
  const { containerRef, universeRef, zoomLevel } = useGalaxyZoom()

  // Inicializa o universo se estiver vazio
  useEffect(() => {
    if (notes.length === 0) {
      initializeGalaxy(800) // Gera 800 estrelas para começar
    }
  }, [])

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* --- UI OVERLAY (HUD) --- */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-2 pointer-events-auto">
          <h1 className="text-white font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Logos Galaxy
          </h1>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ZoomIn className="w-3 h-3" />
              <span>Zoom: <span className="text-white font-mono">{zoomLevel.toFixed(2)}x</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MousePointer2 className="w-3 h-3" />
              <span>Notas: <span className="text-white font-mono">{notes.length}</span></span>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Calculando vetores...</span>
            </div>
          )}
        </div>
      </div>

      {/* --- ÁREA DE ZOOM (D3 Container) --- */}
      {/* Este div captura os eventos de mouse (scroll, drag) */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      >
        
        {/* --- O UNIVERSO (Layer Transformado) --- */}
        {/* Este div recebe o transform (translate/scale) do D3 */}
        <div 
          ref={universeRef} 
          className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
        >
          
          {/* Camada 1: Clusters (Nuvens de fundo) */}
          {clusters.map(cluster => (
            <ClusterNode 
              key={cluster.id} 
              cluster={cluster} 
              zoomLevel={zoomLevel} 
            />
          ))}

          {/* Camada 2: Estrelas (Notas) */}
          {/* Level of Detail (LOD): Só renderiza se o zoom for suficiente */}
          {zoomLevel >= 0.3 && notes.map(note => (
            <StarNode 
              key={note.id} 
              note={note} 
              zoomLevel={zoomLevel} 
            />
          ))}

        </div>
      </div>
      
      {/* Dica Visual de Fundo (Opcional) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none">
        Use scroll para zoom • Arraste para navegar
      </div>
    </div>
  )
}