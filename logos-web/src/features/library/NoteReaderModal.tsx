import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSelectionStore } from "@/stores/selectionStore"
import { useGalaxyStore } from "@/stores/galaxyStore" // <--- Import Novo
import { Tag, FileText, Image, MessageCircle, Share2, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNearestNotes } from "@/lib/math" // <--- Import Novo

export function NoteReaderModal() {
  const { selectedNote, setSelectedNote } = useSelectionStore()
  const allNotes = useGalaxyStore((state) => state.notes) // <--- Pegamos todas as notas
  
  const isOpen = !!selectedNote

  // Calcula as notas próximas sempre que a seleção mudar
  const relatedNotes = useMemo(() => {
    if (!selectedNote) return []
    return getNearestNotes(selectedNote, allNotes, 3)
  }, [selectedNote, allNotes])

  const mockImageUrl = `https://picsum.photos/400/600?random=${selectedNote?.id}`

  const handleOpenChange = (open: boolean) => {
    if (!open) setSelectedNote(null)
  }

  if (!selectedNote) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] bg-[#0a0a0a] border-white/10 text-white p-0 flex overflow-hidden shadow-2xl">
        
        {/* --- COLUNA ESQUERDA: Imagem --- */}
        <div className="w-[35%] bg-black/50 border-r border-white/10 relative hidden md:block">
          <img 
            src={mockImageUrl} 
            className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity duration-500" 
            alt="Original"
          />
          <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1 rounded text-xs text-white/70 flex items-center gap-2">
            <Image className="w-3 h-3" /> Documento Original
          </div>
        </div>

        {/* --- COLUNA CENTRAL: Conteúdo --- */}
        <div className="flex-1 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Header */}
            <div className="mb-6">
              <div className="flex gap-2 mb-3">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-widest bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">
                    {tag}
                  </span>
                ))}
              </div>
              <DialogTitle className="text-3xl font-bold leading-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                {selectedNote.title}
              </DialogTitle>
              <p className="text-sm text-gray-500 font-mono">ID Vetorial: {selectedNote.id}</p>
            </div>

            {/* AI Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" /> Análise da IA
              </h3>
              <p className="text-gray-300 leading-relaxed italic">
                "{selectedNote.preview}..."
              </p>
            </div>

            {/* Texto Completo Mock */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Transcrição Completa</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                <br/><br/>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <MessageCircle className="w-4 h-4 mr-2" /> Chat com Documento
            </Button>
          </div>
        </div>

        {/* --- COLUNA DIREITA: Constelação (Relacionados) --- */}
        <div className="w-[250px] border-l border-white/10 bg-zinc-950/80 flex flex-col">
          <DialogHeader className="p-4 border-b border-white/10 bg-zinc-900/50">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-blue-400">
              <Compass className="w-4 h-4" /> Próximos na Galáxia
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {relatedNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => setSelectedNote(note)} // Navegação!
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 hover:border-white/30 border border-transparent cursor-pointer transition-all group"
              >
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white line-clamp-2 mb-1">
                  {note.title}
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500">{note.tags[0]}</span>
                  {/* Distância Fake */}
                  <span className="text-[9px] text-blue-500/70 font-mono">
                    Dist: {Math.floor(Math.random() * 100)}u
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}