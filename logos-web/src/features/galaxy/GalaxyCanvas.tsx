import { useEffect, useState } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { SolarSystemNode } from "./components/SolarSystemNode"
import { Minimap } from "./components/Minimap"
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"
import { GalaxyControls } from "@/features/galaxy/components/GalaxyControls"
import { GalaxyCreator } from "./components/GalaxyCreator"
import { PdfReaderView } from "@/features/reader/PdfReaderView"

import { Button } from "@/components/ui/button"
import { Loader2, MousePointer2, ZoomIn, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import api from "@/lib/api"
import { toast } from "sonner"
import type { Note } from "@/types/galaxy"

// Interface do estado local para o leitor de PDF
interface ExplorerState {
  documentId: string
  noteId: string
  url: string
}

export function GalaxyCanvas() {
  const { 
    getVisibleData,
    initializeUniverse, 
    isLoading, 
    focusNode, 
    allNotes 
  } = useGalaxyStore()
  
  const { containerRef, universeRef, zoomLevel, flyTo } = useGalaxyZoom()
  const { visibleNotes, visibleClusters, visibleSubClusters } = getVisibleData()

  // Estado para controlar o Leitor de PDF aberto via Galáxia
  const [explorerState, setExplorerState] = useState<ExplorerState | null>(null)

  // 1. Inicialização de Dados
  useEffect(() => {
    // Se não tiver notas carregadas, inicializa.
    // O check de allNotes.length evita recarregar se o usuário só trocou de rota.
    if (allNotes.length === 0) {
      initializeUniverse()
    }
  }, []) 

  // 2. Listener para abrir o PDF (Disparado pelo StarNode)
  useEffect(() => {
    const handleOpenRequest = async (e: Event) => {
        const customEvent = e as CustomEvent;
        const { documentId, noteId } = customEvent.detail

        if (!documentId) {
            toast.error("Documento não vinculado a esta nota.")
            return
        }

        try {
            toast.loading("Descriptografando documento...", { id: "galaxy-open" })
            
            // Busca a URL assinada no Backend (Segurança)
            const { data } = await api.get(`/library/books/${documentId}/content`)
            
            setExplorerState({
                documentId,
                noteId,
                url: data.url
            })
            
            toast.dismiss("galaxy-open")

        } catch (err) {
            console.error(err)
            toast.dismiss("galaxy-open")
            toast.error("Erro ao abrir documento", { description: "Link expirado ou arquivo não encontrado." })
        }
    }

    window.addEventListener('open-book-reader', handleOpenRequest)
    return () => window.removeEventListener('open-book-reader', handleOpenRequest)
  }, [])

  // Helper para fechar o leitor
  const closeExplorer = () => setExplorerState(null)

  return (
    <div className="w-full h-full bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* --- FAILSAFE: Botão se estiver vazio --- */}
      {visibleNotes.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
          <div className="pointer-events-auto text-center space-y-4">
             <p className="text-gray-500 text-sm">Universo vazio ou filtros restritivos.</p>
             <Button onClick={() => initializeUniverse()} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                <RefreshCw className="mr-2 h-4 w-4" /> Gerar Universo
             </Button>
          </div>
        </div>
      )}

      {/* --- CAMADA PRINCIPAL --- */}
      <motion.div 
        className="w-full h-full absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* HUD (Heads Up Display) */}
        <div className="absolute top-6 left-6 z-40 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-auto min-w-[240px]">
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
                <span>Visíveis: <span className="text-white font-mono">{visibleNotes.length}</span></span>
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

        {/* CANVAS D3/ZOOM */}
        <div 
          ref={containerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        >
          <div 
            ref={universeRef} 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
          >
            {/* Renderização em Camadas (Z-Index implícito pela ordem) */}
            
            {/* 1. Galáxias (Fundo) */}
            {visibleClusters.map(cluster => (
              <ClusterNode key={cluster.id} cluster={cluster} zoomLevel={zoomLevel} />
            ))}

            {/* 2. Sistemas Solares (Intermediário) */}
            {visibleSubClusters.map(sub => (
              <SolarSystemNode key={sub.id} subCluster={sub} zoomLevel={zoomLevel} />
            ))}

            {/* 3. Estrelas (Topo - Interativas) */}
            {/* Renderiza apenas se o zoom permitir (LOD) */}
            {zoomLevel >= 0.15 && visibleNotes.map(note => (
              <StarNode key={note.id} note={note} zoomLevel={zoomLevel} />
            ))}
          </div>
        </div>

        {/* COMPONENTES FLUTUANTES */}
        <GalaxyCreator />
        <LibrarySheet clusters={visibleClusters} allNotes={allNotes} />
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none font-mono tracking-wider">
          SCROLL TO ZOOM • DRAG TO MOVE • CLICK TO INTERACT
        </div>
      </motion.div>

      {/* --- MODAIS E OVERLAYS --- */}

      {/* Modo Constelação (Deep Dive) */}
      {focusNode && <ConstellationMode />}
      
      {/* Leitor de Anotação Rápida */}
      <NoteReaderModal />

      {/* LEITOR DE PDF (EXPLORADOR) */}
      {explorerState && (
         <div className="fixed inset-0 z-[200] bg-black">
            <PdfReaderView 
                // Cria um objeto Note temporário para o leitor funcionar
                note={{ 
                    id: explorerState.documentId, // Usa o hash do doc como ID
                    title: "Explorando Contexto", // Título genérico ou buscar da store
                    preview: "", 
                    tags: ["Exploração"], 
                    createdAt: new Date().toISOString(), 
                    x:0, y:0, z:0 
                } as Note}
                
                pdfUrl={explorerState.url} // A URL assinada do GCS
                onClose={closeExplorer}
            />
         </div>
       )}

    </div>
  )
}