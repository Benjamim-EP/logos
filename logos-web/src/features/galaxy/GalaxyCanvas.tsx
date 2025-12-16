import { useEffect } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"
import { BookShelf } from "@/features/library/BookShelf"
import { Button } from "@/components/ui/button"
import { Loader2, MousePointer2, ZoomIn, Book, LayoutGrid } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion" // <--- Import Novo

export function GalaxyCanvas() {
  const { 
    notes, 
    clusters, 
    initializeGalaxy, 
    isLoading, 
    focusNode, 
    viewMode, 
    setViewMode 
  } = useGalaxyStore()
  
  const { containerRef, universeRef, zoomLevel } = useGalaxyZoom()

  useEffect(() => {
    if (notes.length === 0) {
      initializeGalaxy(800)
    }
  }, [])

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* 
          === CAMADA 1: A GALÁXIA (Fica sempre no fundo) === 
          Se a biblioteca estiver aberta, aplicamos um filtro de Blur e Escurecimento
          para dar foco no conteúdo da frente.
      */}
      <motion.div 
        className="w-full h-full absolute inset-0"
        animate={{ 
          filter: viewMode === 'shelf' ? "blur(10px) brightness(0.3)" : "blur(0px) brightness(1)",
          scale: viewMode === 'shelf' ? 0.95 : 1
        }}
        transition={{ duration: 0.5 }}
      >
        {/* UI Overlay da Galáxia */}
        <div className={`absolute top-6 left-6 z-40 pointer-events-none transition-opacity duration-300 ${viewMode === 'shelf' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-auto min-w-[200px]">
            <h1 className="text-white font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Logos Galaxy
            </h1>
            
            <div className="space-y-1 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ZoomIn className="w-3 h-3" />
                <span>Zoom: <span className="text-white font-mono">{zoomLevel.toFixed(2)}x</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MousePointer2 className="w-3 h-3" />
                <span>Notas: <span className="text-white font-mono">{notes.length}</span></span>
              </div>
            </div>

            {/* Switcher de Visualização */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="secondary" 
                className="h-7 text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 cursor-default"
              >
                <LayoutGrid className="w-3 h-3 mr-1.5" /> Galáxia
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-[10px] hover:bg-white/10 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
                onClick={() => setViewMode('shelf')}
              >
                <Book className="w-3 h-3 mr-1.5" /> Livros
              </Button>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-1 justify-center">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Calculando...</span>
              </div>
            )}
          </div>
        </div>

        {/* D3 Canvas Container */}
        <div 
          ref={containerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        >
          <div 
            ref={universeRef} 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
          >
            {clusters.map(cluster => (
              <ClusterNode key={cluster.id} cluster={cluster} zoomLevel={zoomLevel} />
            ))}
            {zoomLevel >= 0.3 && notes.map(note => (
              <StarNode key={note.id} note={note} zoomLevel={zoomLevel} />
            ))}
          </div>
        </div>

        <LibrarySheet allNotes={notes} clusters={clusters} />
        
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none transition-opacity ${viewMode === 'shelf' ? 'opacity-0' : 'opacity-100'}`}>
          Use scroll para zoom • Arraste para navegar • Duplo clique para Deep Dive
        </div>
      </motion.div>

      {/* 
          === CAMADA 2: A BIBLIOTECA (Overlay) === 
          Entra deslizando de baixo para cima ou com Fade In
      */}
      <AnimatePresence>
        {viewMode === 'shelf' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0 }}
            className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl" // Fundo semi-transparente ou sólido
          >
            <BookShelf />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camadas Modais (Sempre no topo) */}
      {focusNode && <ConstellationMode />}
      <NoteReaderModal />

    </div>
  )
}