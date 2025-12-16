import { useEffect } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"
import { BookShelf } from "@/features/library/BookShelf"
import { ProfilePage } from "@/features/profile/ProfilePage" // Nova Página
import { GalaxyControls } from "@/features/galaxy/components/GalaxyControls"
import { Button } from "@/components/ui/button"
import { Loader2, MousePointer2, ZoomIn, Book, LayoutGrid, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function GalaxyCanvas() {
  const { 
    getVisibleData,
    initializeGalaxy, 
    isLoading, 
    focusNode, 
    viewMode, 
    setViewMode,
    allNotes 
  } = useGalaxyStore()
  
  // Hook de Física (D3.js)
  const { containerRef, universeRef, zoomLevel } = useGalaxyZoom()

  // Dados filtrados pelos controles
  const { visibleNotes, visibleClusters } = getVisibleData()

  // Inicializa o universo se estiver vazio
  useEffect(() => {
    if (allNotes.length === 0) {
      initializeGalaxy(1500)
    }
  }, [])

  // Verifica se alguma sobreposição (overlay) está ativa para aplicar blur na galáxia
  const isOverlayActive = viewMode !== 'galaxy'

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* 
          === CAMADA 1: A GALÁXIA (Fundo) === 
          Aplicamos animação de blur/scale quando o usuário entra em outras telas
      */}
      <motion.div 
        className="w-full h-full absolute inset-0"
        animate={{ 
          filter: isOverlayActive ? "blur(10px) brightness(0.3)" : "blur(0px) brightness(1)",
          scale: isOverlayActive ? 0.95 : 1
        }}
        transition={{ duration: 0.5, ease: "circOut" }}
      >
        
        {/* --- HUD (Interface de Controle) --- */}
        <div className={`absolute top-6 left-6 z-40 pointer-events-none transition-all duration-300 ${isOverlayActive ? 'opacity-0 -translate-x-10' : 'opacity-100 translate-x-0'}`}>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-auto min-w-[220px]">
            <h1 className="text-white font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Logos Galaxy
            </h1>
            
            {/* Estatísticas */}
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
            
            {/* Controles de Filtro */}
            <GalaxyControls />

            {/* Menu de Navegação */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 mt-2">
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
              {/* Botão Perfil (Ocupa 2 colunas) */}
              <Button 
                size="sm" 
                variant="ghost" 
                className="col-span-2 h-7 text-[10px] hover:bg-white/10 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
                onClick={() => setViewMode('profile')}
              >
                <User className="w-3 h-3 mr-1.5" /> Meu Perfil
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

        {/* --- D3 CANVAS (O Universo) --- */}
        <div 
          ref={containerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        >
          <div 
            ref={universeRef} 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
          >
            {/* Renderiza Clusters (Títulos) */}
            {visibleClusters.map(cluster => (
              <ClusterNode 
                key={cluster.id} 
                cluster={cluster} 
                zoomLevel={zoomLevel} 
              />
            ))}

            {/* Renderiza Estrelas (Notas) */}
            {zoomLevel >= 0.3 && visibleNotes.map(note => (
              <StarNode 
                key={note.id} 
                note={note} 
                zoomLevel={zoomLevel} 
              />
            ))}
          </div>
        </div>

        {/* Botão da Lista Lateral */}
        <LibrarySheet allNotes={visibleNotes} clusters={visibleClusters} />
        
        {/* Dica de Rodapé */}
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none transition-opacity ${isOverlayActive ? 'opacity-0' : 'opacity-100'}`}>
          Use scroll para zoom • Arraste para navegar • Duplo clique para Deep Dive
        </div>
      </motion.div>

      {/* 
          === CAMADA 2: OVERLAYS (Telas Cheias) === 
          Usamos AnimatePresence para transições suaves de entrada e saída
      */}
      <AnimatePresence>
        
        {/* Modo Estante (Livros) */}
        {viewMode === 'shelf' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0 }}
            className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl"
          >
            <BookShelf />
          </motion.div>
        )}

        {/* Modo Perfil (Dashboard) */}
        {viewMode === 'profile' && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.4, type: "spring", bounce: 0 }}
            className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl"
          >
            <ProfilePage />
          </motion.div>
        )}

      </AnimatePresence>

      {/* --- CAMADA 3: MODAIS DE CONTEXTO --- */}
      {/* Deep Dive (Constelação) */}
      {focusNode && <ConstellationMode />}

      {/* Leitor de Nota (Máximo Z-Index) */}
      <NoteReaderModal />

    </div>
  )
}