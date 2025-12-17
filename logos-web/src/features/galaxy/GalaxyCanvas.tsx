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
import { motion } from "framer-motion"

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
    if (allNotes.length === 0) initializeGalaxy(1500)
  }, [])

  return (
    <div className="w-full h-full bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      <motion.div 
        className="w-full h-full absolute inset-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
      >
        {/* HUD Simplificado (Sem navegação, pois agora tem Header) */}
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
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-1 justify-center">
                <Loader2 className="w-3 h-3 animate-spin" /><span>Calculando...</span>
              </div>
            )}
          </div>
        </div>

        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none">
          <div ref={universeRef} className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform">
            {visibleClusters.map(cluster => <ClusterNode key={cluster.id} cluster={cluster} zoomLevel={zoomLevel} />)}
            {visibleSubClusters.map(sub => <SolarSystemNode key={sub.id} subCluster={sub} zoomLevel={zoomLevel} />)}
            {zoomLevel >= 0.3 && visibleNotes.map(note => <StarNode key={note.id} note={note} zoomLevel={zoomLevel} />)}
          </div>
        </div>

        <LibrarySheet allNotes={visibleNotes} clusters={visibleClusters} />
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none">
          Use scroll para zoom • Arraste para navegar • Duplo clique para Deep Dive
        </div>
      </motion.div>

      {focusNode && <ConstellationMode />}
      <NoteReaderModal />
    </div>
  )
}