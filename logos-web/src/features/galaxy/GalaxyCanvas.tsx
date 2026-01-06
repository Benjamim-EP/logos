import { useEffect, useState } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"

// Componentes da Galáxia
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { SolarSystemNode } from "./components/SolarSystemNode"
import { Minimap } from "./components/Minimap"
import { GalaxyControls } from "@/features/galaxy/components/GalaxyControls"
import { GalaxyCreator } from "./components/GalaxyCreator"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"

// Componentes da Biblioteca/Leitura
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { PdfReaderView } from "@/features/reader/PdfReaderView"

// UI e Utils
import { Button } from "@/components/ui/button"
import { Loader2, MousePointer2, ZoomIn, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import api from "@/lib/api"
import { toast } from "sonner"
import type { Note } from "@/types/galaxy"

// Interface do estado local para o leitor de PDF (Explorador)
interface ExplorerState {
  documentId: string
  noteId: string
  url: string
  position?: any // Coordenadas visuais para auto-scroll
}

export function GalaxyCanvas() {
  // Store Global
  const { 
    getVisibleData,
    initializeUniverse, 
    isLoading, 
    focusNode, 
    allNotes 
  } = useGalaxyStore()
  
  // Hook de Zoom (D3.js)
  const { containerRef, universeRef, zoomLevel, flyTo } = useGalaxyZoom()
  
  // Dados filtrados para renderização
  const { visibleNotes, visibleClusters, visibleSubClusters } = getVisibleData()

  // Estado local para abrir o PDF em modo de exploração
  const [explorerState, setExplorerState] = useState<ExplorerState | null>(null)

  // 1. Inicialização de Dados
  useEffect(() => {
    // Se não tiver notas carregadas, inicializa.
    // O check de allNotes.length evita recarregar se o usuário só trocou de rota e voltou.
    if (allNotes.length === 0) {
      initializeUniverse()
    }
  }, []) 

  useEffect(() => {
      const handleRefresh = () => {
          console.log("🌌 Atualização da galáxia solicitada externamente.");
          initializeUniverse();
      }
      window.addEventListener('refresh-galaxy', handleRefresh)
      return () => window.removeEventListener('refresh-galaxy', handleRefresh)
  }, [])

  // 2. Listener de Eventos Customizados (Comunicação entre StarNode e Canvas)
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
            
            // Busca a URL assinada no Backend (Segurança & Acesso ao GCS)
            const { data } = await api.get(`/library/books/${documentId}/content`)
            
            setExplorerState({
                documentId,
                noteId,
                url: data.url,
                position: position // Passa a posição salva para o leitor fazer scroll
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

    // Registra o ouvinte
    window.addEventListener('open-book-reader', handleOpenRequest)
    
    // Cleanup ao desmontar
    return () => window.removeEventListener('open-book-reader', handleOpenRequest)
  }, [])

  // Helper para fechar o leitor
  const closeExplorer = () => setExplorerState(null)

  return (
    <div className="w-full h-full bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* --- FAILSAFE: Botão de Recarga se estiver vazio --- */}
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

      {/* --- CAMADA PRINCIPAL (Animação de Entrada) --- */}
      <motion.div 
        className="w-full h-full absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* HUD (Heads Up Display) - Interface Flutuante */}
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

        {/* CANVAS INFINITO (D3 Zoom Container) */}
        <div 
          ref={containerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        >
          <div 
            ref={universeRef} 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
          >
            {/* Renderização em Camadas (Ordem importa para o Z-Index) */}
            
            {/* 1. Camada de Fundo: Galáxias (Labels Gigantes) */}
            {visibleClusters.map(cluster => (
              <ClusterNode key={cluster.id} cluster={cluster} zoomLevel={zoomLevel} />
            ))}

            {/* 2. Camada Intermediária: Sistemas Solares */}
            {visibleSubClusters.map(sub => (
              <SolarSystemNode key={sub.id} subCluster={sub} zoomLevel={zoomLevel} />
            ))}

            {/* 3. Camada Superior: Estrelas (Interativas) */}
            {/* LOD: Renderiza apenas se o zoom permitir visualizar detalhes */}
            {zoomLevel >= 0.15 && visibleNotes.map(note => (
              <StarNode key={note.id} note={note} zoomLevel={zoomLevel} />
            ))}
          </div>
        </div>

        {/* COMPONENTES FLUTUANTES (Rodapé e Laterais) */}
        <GalaxyCreator />
        <LibrarySheet clusters={visibleClusters} allNotes={allNotes} />
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-[10px] uppercase tracking-[0.2em] pointer-events-none select-none font-mono">
          Scroll to Zoom • Drag to Move • Click to Interact
        </div>
      </motion.div>

      {/* --- MODAIS E OVERLAYS (Z-Index Elevado) --- */}

      {/* Modo Constelação (Deep Dive ao clicar 2x em um nó) */}
      <AnimatePresence>
        {focusNode && <ConstellationMode />}
      </AnimatePresence>
      
      {/* Leitor de Anotação Rápida (Modal Lateral) */}
      <NoteReaderModal />

      {/* LEITOR DE PDF IMERSIVO (EXPLORADOR) */}
      {/* Aberto via clique na opção "Explorar" da estrela */}
      {explorerState && (
         <div className="fixed inset-0 z-[200] bg-black animate-in fade-in duration-300">
            <PdfReaderView 
                // Cria um objeto Note temporário para o leitor funcionar corretamente
                note={{ 
                    id: explorerState.documentId, // Usa o hash do doc como ID principal
                    title: "Explorando Contexto", // Título de fallback
                    preview: "Modo de leitura via Galáxia", 
                    tags: ["Exploração"], 
                    createdAt: new Date().toISOString(), 
                    x:0, y:0, z:0,
                    documentId: explorerState.documentId
                } as Note}
                
                pdfUrl={explorerState.url} // A URL assinada do GCS
                initialPosition={explorerState.position} // A posição para scroll automático
                onClose={closeExplorer}
            />
         </div>
       )}

    </div>
  )
}