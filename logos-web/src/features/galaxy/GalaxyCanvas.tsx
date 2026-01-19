import { useEffect, useState } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { useAuthStore } from "@/stores/authStore" 
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { SolarSystemNode } from "./components/SolarSystemNode"
import { Minimap } from "./components/Minimap"
import { GalaxyControls } from "@/features/galaxy/components/GalaxyControls"
import { GalaxyCreator } from "./components/GalaxyCreator"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"

import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { PdfReaderView } from "@/features/reader/PdfReaderView"

import { Button } from "@/components/ui/button"
import { Loader2, MousePointer2, ZoomIn, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import api from "@/lib/api"
import { toast } from "sonner"
import type { Note } from "@/types/galaxy"
import { t } from "i18next"

interface ExplorerState {
  documentId: string
  noteId: string
  url: string
  position?: any 
}

export function GalaxyCanvas() {
  const { 
    getVisibleData,
    initializeUniverse, 
    isLoading, 
    focusNode, 
    allNotes 
  } = useGalaxyStore()

  const guestUniverse = useAuthStore((state) => state.guestUniverse)
  
  const { containerRef, universeRef, zoomLevel, flyTo } = useGalaxyZoom()
  
  const { visibleNotes, visibleClusters, visibleSubClusters } = getVisibleData()

  const [explorerState, setExplorerState] = useState<ExplorerState | null>(null)

  useEffect(() => {
    if (guestUniverse?.id) {
        initializeUniverse()
    } 
    else if (allNotes.length === 0) {
        initializeUniverse()
    }
  }, [guestUniverse?.id]) 

  useEffect(() => {
      const handleRefresh = () => {
          console.log("🌌 Atualização da galáxia solicitada externamente.");
          initializeUniverse();
      }
      window.addEventListener('refresh-galaxy', handleRefresh)
      return () => window.removeEventListener('refresh-galaxy', handleRefresh)
  }, [])

  useEffect(() => {
    const handleOpenRequest = async (e: Event) => {
        const customEvent = e as CustomEvent;
        const { documentId, noteId, position } = customEvent.detail

        if (!documentId) {
            toast.error("Este nó não possui um documento vinculado.")
            return
        }

        try {
            toast.loading("Descriptografando documento...", { id: "galaxy-open" })
            
            const { data } = await api.get(`/library/books/${documentId}/content`)
            
            setExplorerState({
                documentId,
                noteId,
                url: data.url,
                position: position 
            })
            
            toast.dismiss("galaxy-open")

        } catch (err) {
            console.error(err)
            toast.dismiss("galaxy-open")
            toast.error("Erro ao abrir documento", { 
                description: "O arquivo pode ter sido movido ou o link expirou." 
            })
        }
    }

    window.addEventListener('open-book-reader', handleOpenRequest)
    
    return () => window.removeEventListener('open-book-reader', handleOpenRequest)
  }, [])

  const closeExplorer = () => setExplorerState(null)

  return (
    <div className="w-full h-full bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {visibleNotes.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
          <div className="pointer-events-auto text-center space-y-4 bg-black/50 p-6 rounded-xl border border-white/10 backdrop-blur-md">
             <p className="text-gray-400 text-sm">Universo vazio ou filtros muito restritivos.</p>
             <Button 
                onClick={() => initializeUniverse()} 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 hover:text-blue-400"
             >
                <RefreshCw className="mr-2 h-4 w-4" /> Gerar Universo
             </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isLoading && (
            <motion.div 
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center"
            >
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-t-cyan-500 border-r-purple-500 border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
                </div>
                <h2 className="mt-8 text-xl font-bold text-white tracking-widest uppercase">
                    Carregando Universo...
                </h2>
                <p className="text-sm text-gray-500 mt-2 font-mono">
                    {guestUniverse?.id ? `Sincronizando com ${guestUniverse.id}` : "Calibrando sensores"}
                </p>
            </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="w-full h-full absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-6 left-6 z-40 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-auto min-w-[240px]">
            <h1 className="text-white font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
               {t('galaxy.hud_title')}
            </h1>
            
            <div className="space-y-1 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ZoomIn className="w-3 h-3" />
                <span>{t('galaxy.zoom')}:<span className="text-white font-mono">{zoomLevel.toFixed(2)}x</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MousePointer2 className="w-3 h-3" />
                <span>{t('galaxy.visible')}: <span className="text-white font-mono">{visibleNotes.length}</span></span>
              </div>
            </div>
            
            <GalaxyControls />

            <Minimap 
              clusters={visibleClusters} 
              onNavigate={(x, y) => flyTo(x, y, 0.9)}
            />

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-2 justify-center border-t border-white/5 mt-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Calculando gravidade...</span>
              </div>
            )}
          </div>
        </div>

        <div 
          ref={containerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        >
          <div 
            ref={universeRef} 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
          >
            {visibleClusters.map(cluster => (
              <ClusterNode key={cluster.id} cluster={cluster} zoomLevel={zoomLevel} />
            ))}

            {visibleSubClusters.map(sub => (
              <SolarSystemNode key={sub.id} subCluster={sub} zoomLevel={zoomLevel} />
            ))}

            {zoomLevel >= 0.15 && visibleNotes.map(note => (
              <StarNode key={note.id} note={note} zoomLevel={zoomLevel} />
            ))}
          </div>
        </div>

        <GalaxyCreator />
        <LibrarySheet clusters={visibleClusters} allNotes={allNotes} />
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-[10px] uppercase tracking-[0.2em] pointer-events-none select-none font-mono">
          Scroll to Zoom • Drag to Move • Click to Interact
        </div>
      </motion.div>

      <AnimatePresence>
        {focusNode && <ConstellationMode />}
      </AnimatePresence>
      
      <NoteReaderModal />

      {explorerState && (
         <div className="fixed inset-0 z-[200] bg-black animate-in fade-in duration-300">
            <PdfReaderView 
                
                note={{ 
                    id: explorerState.documentId, 
                    title: "Explorando Contexto", 
                    preview: "Modo de leitura via Galáxia", 
                    tags: ["Exploração"], 
                    createdAt: new Date().toISOString(), 
                    x:0, y:0, z:0,
                    documentId: explorerState.documentId
                } as Note}
                
                pdfUrl={explorerState.url} 
                initialPosition={explorerState.position}
                onClose={closeExplorer}
            />
         </div>
       )}

    </div>
  )
}