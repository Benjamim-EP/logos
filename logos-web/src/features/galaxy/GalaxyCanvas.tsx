import { useEffect } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { SolarSystemNode } from "./components/SolarSystemNode"
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"
import { GalaxyControls } from "@/features/galaxy/components/GalaxyControls"
import { Loader2, MousePointer2, ZoomIn } from "lucide-react"
// Removendo imports de animação complexa na raiz para teste
// import { motion } from "framer-motion" 

export function GalaxyCanvas() {
  const { 
    getVisibleData,
    initializeGalaxy, 
    isLoading, 
    focusNode, 
    allNotes 
  } = useGalaxyStore()
  
  const { containerRef, universeRef, zoomLevel } = useGalaxyZoom()
  const { visibleNotes, visibleClusters, visibleSubClusters } = getVisibleData()

  useEffect(() => {
    // Garante inicialização mesmo se o array estiver vazio
    if (allNotes.length === 0) {
      console.log("🌌 Inicializando Galáxia...") // Log para debug
      initializeGalaxy(1500)
    }
  }, [])

  return (
    // CORREÇÃO 1: 'absolute inset-0' força o preenchimento total do pai relative
    <div className="absolute inset-0 bg-[#050505] overflow-hidden selection:bg-purple-500/30">
      
      {/* 
          CORREÇÃO 2: Removido motion.div da raiz para evitar conflito de opacidade.
          Usando div normal para garantir visibilidade imediata.
      */}
      <div className="w-full h-full relative">
        
        {/* --- HUD (Painel de Controle) --- */}
        <div className="absolute top-6 left-6 z-40 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-auto min-w-[220px]">
            <h1 className="text-white font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Sistema Solar
            </h1>
            
            <div className="space-y-1 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ZoomIn className="w-3 h-3" />
                <span>Zoom: <span className="text-white font-mono">{zoomLevel.toFixed(2)}x</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MousePointer2 className="w-3 h-3" />
                <span>Visíveis: <span className="text-white font-mono">{visibleNotes.length}</span></span>
              </div>
            </div>
            
            <GalaxyControls />

            {/* Loading explícito */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-1 justify-center">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Calculando gravidade...</span>
              </div>
            )}
          </div>
        </div>

        {/* --- D3 CANVAS --- */}
        <div 
          ref={containerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        >
          <div 
            ref={universeRef} 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
          >
            {/* Clusters */}
            {visibleClusters.map(cluster => (
              <ClusterNode key={cluster.id} cluster={cluster} zoomLevel={zoomLevel} />
            ))}

            {/* SubClusters */}
            {visibleSubClusters.map(sub => (
              <SolarSystemNode key={sub.id} subCluster={sub} zoomLevel={zoomLevel} />
            ))}

            {/* Estrelas */}
            {zoomLevel >= 0.3 && visibleNotes.map(note => (
              <StarNode key={note.id} note={note} zoomLevel={zoomLevel} />
            ))}
          </div>
        </div>

        {/* Botão da Lista Lateral */}
        <LibrarySheet allNotes={visibleNotes} clusters={visibleClusters} />
        
        {/* Rodapé */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none">
          Use scroll para zoom • Arraste para navegar • Duplo clique para Deep Dive
        </div>
      </div>

      {/* --- MODAIS --- */}
      {focusNode && <ConstellationMode />}
      <NoteReaderModal />

    </div>
  )
}