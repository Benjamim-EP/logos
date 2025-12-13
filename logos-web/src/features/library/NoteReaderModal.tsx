import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog" // Adicionei DialogDescription que faltava no import
import { useSelectionStore } from "@/stores/selectionStore"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { Tag, FileText, Image, MessageCircle, Share2, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNearestNotes } from "@/lib/math"

export function NoteReaderModal() {
  const { selectedNote, setSelectedNote } = useSelectionStore()
  const allNotes = useGalaxyStore((state) => state.notes)
  
  const isOpen = !!selectedNote

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
      
      {/* 
          --- CORREÇÃO AQUI --- 
          Adicionei z-[100] para garantir que fique acima do Deep Dive (que é z-60).
      */}
      <DialogContent className="max-w-5xl h-[85vh] bg-[#0a0a0a] border-white/10 text-white p-0 flex overflow-hidden shadow-2xl z-[100] gap-0">
        
        {/* --- COLUNA ESQUERDA: Imagem --- */}
        <div className="w-[35%] bg-black/50 border-r border-white/10 relative hidden md:block group">
          <img 
            src={mockImageUrl} 
            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" 
            alt="Original"
          />
          <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1 rounded text-xs text-white/70 flex items-center gap-2 backdrop-blur-sm border border-white/5">
            <Image className="w-3 h-3" /> Documento Original
          </div>
        </div>

        {/* --- COLUNA CENTRAL: Conteúdo --- */}
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
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
              <DialogDescription className="text-sm text-gray-500 font-mono">
                ID Vetorial: {selectedNote.id}
              </DialogDescription>
            </div>

            {/* AI Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 hover:bg-white/10 transition-colors">
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" /> Análise da IA
              </h3>
              <p className="text-gray-300 leading-relaxed italic border-l-2 border-green-500/30 pl-4">
                "{selectedNote.preview}..."
              </p>
            </div>

            {/* Texto Completo Mock */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Transcrição Completa</h3>
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
          <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center backdrop-blur-sm">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/5">
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
              <MessageCircle className="w-4 h-4 mr-2" /> Chat com Documento
            </Button>
          </div>
        </div>

        {/* --- COLUNA DIREITA: Constelação (Relacionados) --- */}
        <div className="w-[280px] border-l border-white/10 bg-zinc-950/80 flex flex-col backdrop-blur-xl">
          <div className="p-4 border-b border-white/10 bg-zinc-900/50">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
              <Compass className="w-4 h-4" /> Próximos na Galáxia
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {relatedNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => setSelectedNote(note)} // Navegação Interna
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 hover:border-white/30 border border-transparent cursor-pointer transition-all group"
              >
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white line-clamp-2 mb-2 leading-snug">
                  {note.title}
                </h4>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span className="text-[10px] text-gray-500 bg-black/30 px-1.5 py-0.5 rounded">{note.tags[0]}</span>
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