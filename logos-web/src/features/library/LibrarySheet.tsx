import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Library, Book } from "lucide-react"
import type { Cluster, Note } from "@/types/galaxy"
import { VirtualizedNoteList } from "./components/VirtualizedNoteList"
import { useState } from "react"
import { useTranslation } from "react-i18next"

interface LibrarySheetProps {
  clusters: Cluster[]
  allNotes: Note[]
}

export function LibrarySheet({ clusters, allNotes }: LibrarySheetProps) {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)

  const filteredNotes = selectedCluster
    ? allNotes.filter(note => note.tags?.includes(selectedCluster.label))
    : allNotes

  const { t } = useTranslation()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="secondary" 
          className="absolute bottom-6 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-6 py-6 rounded-2xl shadow-2xl"
        >
          <Library className="w-5 h-5 mr-3 text-blue-400" />
          {t('library.explore_btn')} ({allNotes.length})
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[450px] sm:w-[540px] bg-[#050505] border-l border-white/10 text-white p-0 flex flex-col">
        
        <div className="p-6 pb-4">
          <SheetHeader>
            <SheetTitle className="text-white text-2xl font-bold flex items-center">
              <Book className="w-6 h-6 mr-3 text-blue-500" />
              {selectedCluster ? selectedCluster.label : "Todas as Notas"}
            </SheetTitle>
            <SheetDescription className="text-gray-400">
              {selectedCluster 
                ? `${filteredNotes.length} conexões encontradas neste tema.`
                : `Navegue por todo o seu conhecimento capturado.`
              }
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Filtrar por Galáxia</h3>
                {selectedCluster && (
                    <button onClick={() => setSelectedCluster(null)} className="text-[10px] text-blue-400 hover:underline">Limpar</button>
                )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {clusters.map(cluster => (
                <button 
                  key={cluster.id}
                  onClick={() => setSelectedCluster(cluster.id === selectedCluster?.id ? null : cluster)}
                  style={{ 
                      borderColor: selectedCluster?.id === cluster.id ? cluster.color : 'rgba(255,255,255,0.1)',
                      backgroundColor: selectedCluster?.id === cluster.id ? `${cluster.color}15` : 'transparent',
                      color: selectedCluster?.id === cluster.id ? 'white' : '#a1a1aa'
                  }}
                  className="px-3 py-1.5 rounded-lg border text-xs transition-all hover:border-white/30"
                >
                  {cluster.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden border-t border-white/5">
            <VirtualizedNoteList notes={filteredNotes} />
        </div>
        
      </SheetContent>
    </Sheet>
  )
}