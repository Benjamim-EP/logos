import { useEffect } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"
import { Loader2, MousePointer2, ZoomIn } from "lucide-react"

export function GalaxyCanvas() {
  // Estado Global da Galáxia
  const { notes, clusters, initializeGalaxy, isLoading, focusNode } = useGalaxyStore()
  
  // Hook de Física (D3.js)
  const { containerRef, universeRef, zoomLevel } = useGalaxyZoom()

  // Inicializa o universo se estiver vazio ao montar o componente
  useEffect(() => {
    if (notes.length === 0) {
      initializeGalaxy(800) // Gera 800 notas para o cenário inicial
    }
  }, [])

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* --- CAMADA 1: UI OVERLAY (HUD) --- */}
      {/* Fica fixo no canto superior esquerdo, não sofre zoom */}
      <div className="absolute top-6 left-6 z-40 pointer-events-none">
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

      {/* --- CAMADA 2: ÁREA DE ZOOM (D3 Container) --- */}
      {/* Captura eventos de mouse (scroll/drag) */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      >
        
        {/* --- CAMADA 3: O UNIVERSO (Elemento Transformado) --- */}
        {/* Recebe o scale/translate do D3 */}
        <div 
          ref={universeRef} 
          className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
        >
          
          {/* 3.1 Clusters (Títulos de Fundo) */}
          {clusters.map(cluster => (
            <ClusterNode 
              key={cluster.id} 
              cluster={cluster} 
              zoomLevel={zoomLevel} 
            />
          ))}

          {/* 3.2 Estrelas (Notas) */}
          {/* Level of Detail (LOD): Só renderiza se o zoom for >= 0.3 */}
          {zoomLevel >= 0.3 && notes.map(note => (
            <StarNode 
              key={note.id} 
              note={note} 
              zoomLevel={zoomLevel} 
            />
          ))}

        </div>
      </div>
      
      {/* --- CAMADA 4: INTERFACE FLUTUANTE --- */}
      
      {/* Botão da Biblioteca (Canto Inferior Direito) */}
      <LibrarySheet allNotes={notes} clusters={clusters} />

      {/* Dica Visual no Rodapé */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none">
        Use scroll para zoom • Arraste para navegar • Duplo clique para Deep Dive
      </div>

      {/* --- CAMADA 5: MODO CONSTELAÇÃO (DEEP DIVE) --- */}
      {/* Quando ativo, cobre a galáxia com o modo de exploração focado */}
      {focusNode && <ConstellationMode />}

      {/* --- CAMADA 6: MODAL DE LEITURA --- */}
      {/* Fica sempre no topo de tudo (z-index máximo dentro do componente) */}
      <NoteReaderModal />

    </div>
  )
}