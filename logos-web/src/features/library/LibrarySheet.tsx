import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Library, Filter, ChevronRight } from "lucide-react"
import type { Cluster, Note } from "@/types/galaxy"
import { VirtualizedNoteList } from "./components/VirtualizedNoteList"
import { useState } from "react"

interface LibrarySheetProps {
  clusters: Cluster[]
  allNotes: Note[]
}

export function LibrarySheet({ clusters, allNotes }: LibrarySheetProps) {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)

  // Filtra as notas com base no cluster selecionado
  const filteredNotes = selectedCluster
    ? allNotes.filter(note => note.clusterId === selectedCluster.id)
    : allNotes

  // Sênior UX: Mostrar as 5 mais recentes no Card (em vez de todas)
  const topNotes = filteredNotes.slice(0, 5);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* Botão de abrir a biblioteca */}
        <Button 
          variant="secondary" 
          className="absolute bottom-6 right-6 z-50 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white"
        >
          <Library className="w-4 h-4 mr-2" />
          Abrir Biblioteca ({allNotes.length} Notas)
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[450px] sm:w-[540px] bg-[#050505] border-l border-white/10 text-white">
        
        {/* Cabeçalho */}
        <SheetHeader>
          <SheetTitle className="text-white text-2xl font-bold flex items-center">
            <Library className="w-6 h-6 mr-3 text-purple-400" />
            {selectedCluster ? selectedCluster.label : "Biblioteca Geral"}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            {selectedCluster 
              ? `Todas as ${filteredNotes.length} anotações do tema ${selectedCluster.label}.`
              : `Selecione um tema para refinar sua galáxia.`
            }
          </SheetDescription>
        </SheetHeader>

        {/* Bar de Filtros (Simulação de Seleção de Tema) */}
        <div className="py-4 border-b border-white/10 mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1 text-gray-300">
            <Filter className="w-4 h-4" /> Filtros Rápidos (Sistemas Solares)
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant={selectedCluster ? "outline" : "default"} 
              onClick={() => setSelectedCluster(null)}
              className="bg-white/10 hover:bg-white/20 border-white/30"
            >
              Todos ({allNotes.length})
            </Button>
            {clusters.map(cluster => (
              <Button 
                key={cluster.id} 
                size="sm" 
                variant={selectedCluster?.id === cluster.id ? "default" : "outline"} 
                onClick={() => setSelectedCluster(cluster)}
                style={{ 
                    backgroundColor: selectedCluster?.id === cluster.id ? cluster.color : 'transparent',
                    borderColor: cluster.color,
                    color: selectedCluster?.id === cluster.id ? 'black' : cluster.color
                }}
                className={selectedCluster?.id === cluster.id ? 'hover:opacity-90' : 'bg-white/5 hover:bg-white/10'}
              >
                {cluster.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista Virtualizada (Onde a mágica da performance acontece) */}
        <VirtualizedNoteList notes={filteredNotes} />
        
      </SheetContent>
    </Sheet>
  )
}