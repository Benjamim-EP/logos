import { useEffect } from "react"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useGalaxyZoom } from "@/features/galaxy/hooks/useGalaxyZoom"
import { StarNode } from "./components/StarNode"
import { ClusterNode } from "./components/ClusterNode"
import { LibrarySheet } from "@/features/library/LibrarySheet"
import { NoteReaderModal } from "@/features/library/NoteReaderModal"
import { ConstellationMode } from "@/features/galaxy/ConstellationMode"
import { BookShelf } from "@/features/library/BookShelf" // Import da Estante
import { Button } from "@/components/ui/button"
import { Loader2, MousePointer2, ZoomIn, Book, LayoutGrid } from "lucide-react"

export function GalaxyCanvas() {
  // Estado Global (Adicionado viewMode e setViewMode)
  const { 
    notes, 
    clusters, 
    initializeGalaxy, 
    isLoading, 
    focusNode, 
    viewMode, 
    setViewMode 
  } = useGalaxyStore()
  
  // Hook de Física (D3.js)
  const { containerRef, universeRef, zoomLevel } = useGalaxyZoom()

  // Inicializa o universo se estiver vazio
  useEffect(() => {
    if (notes.length === 0) {
      initializeGalaxy(800)
    }
  }, [])

  // --- ROTEAMENTO DE VISUALIZAÇÃO ---
  // Se o usuário escolheu ver a estante de livros, renderizamos ela e saímos do Canvas
  if (viewMode === 'shelf') {
    return <BookShelf />
  }

  // --- VISUALIZAÇÃO GALÁXIA (PADRÃO) ---
  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* --- CAMADA 1: UI OVERLAY (HUD) --- */}
      <div className="absolute top-6 left-6 z-40 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-auto min-w-[200px]">
          
          {/* Título */}
          <h1 className="text-white font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Logos Galaxy
          </h1>
          
          {/* Stats */}
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

          {/* Switcher de Visualização (Novo) */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-7 text-[10px] bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 cursor-default"
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

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-1 justify-center">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Calculando vetores...</span>
            </div>
          )}
        </div>
      </div>

      {/* --- CAMADA 2: ÁREA DE ZOOM (D3 Container) --- */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      >
        {/* O Universo Transformado */}
        <div 
          ref={universeRef} 
          className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
        >
          {/* Clusters */}
          {clusters.map(cluster => (
            <ClusterNode 
              key={cluster.id} 
              cluster={cluster} 
              zoomLevel={zoomLevel} 
            />
          ))}

          {/* Estrelas */}
          {zoomLevel >= 0.3 && notes.map(note => (
            <StarNode 
              key={note.id} 
              note={note} 
              zoomLevel={zoomLevel} 
            />
          ))}
        </div>
      </div>
      
      {/* --- CAMADA 3: INTERFACE FLUTUANTE --- */}
      
      {/* Botão da Lista de Notas (Drawer Lateral) */}
      <LibrarySheet allNotes={notes} clusters={clusters} />

      {/* Dica Visual */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none">
        Use scroll para zoom • Arraste para navegar • Duplo clique para Deep Dive
      </div>

      {/* --- CAMADA 4: MODO CONSTELAÇÃO (DEEP DIVE) --- */}
      {focusNode && <ConstellationMode />}

      {/* --- CAMADA 5: MODAL DE LEITURA (Topo da Pilha) --- */}
      <NoteReaderModal />

    </div>
  )
}