import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useSelectionStore } from "@/stores/selectionStore"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { Tag, FileText, Image, MessageCircle, Share2, Compass, BookOpen, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNearestNotes } from "@/lib/math"
import { PdfReaderView } from "@/features/reader/PdfReaderView"

export function NoteReaderModal() {
  const { selectedNote, setSelectedNote } = useSelectionStore()
  const allNotes = useGalaxyStore((state) => state.notes)
  
  // Estado local para controlar se estamos vendo o PDF Fullscreen
  const [isReadingPdf, setIsReadingPdf] = useState(false)

  // Reseta o modo de leitura se mudar de nota
  useEffect(() => {
    setIsReadingPdf(false)
  }, [selectedNote?.id])

  const isOpen = !!selectedNote

  // Calcula vizinhos próximos (Sistema de Recomendação)
  const relatedNotes = useMemo(() => {
    if (!selectedNote) return []
    return getNearestNotes(selectedNote, allNotes, 3)
  }, [selectedNote, allNotes])

  // Mock de Imagem e PDF
  const mockImageUrl = `https://picsum.photos/400/600?random=${selectedNote?.id}`
  // PDF Exemplo (Artigo sobre LLMs para teste)
  const MOCK_PDF_URL = "/sample.pdf" 

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedNote(null)
      setIsReadingPdf(false)
    }
  }

  // Se não tem nota, não renderiza nada
  if (!selectedNote) return null

  // --- MODO LEITURA IMERSIVA (PDF READER) ---
  if (isReadingPdf) {
    return (
      <PdfReaderView 
        note={selectedNote}
        pdfUrl={MOCK_PDF_URL}
        onClose={() => setIsReadingPdf(false)}
      />
    )
  }

  // --- MODO VISÃO GERAL (MODAL) ---
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      
      {/* Z-Index 100 para ficar acima do Deep Dive e da Galáxia */}
      <DialogContent className="max-w-6xl h-[85vh] bg-[#0a0a0a] border-white/10 text-white p-0 flex overflow-hidden shadow-2xl z-[100] gap-0 outline-none">
        
        {/* --- COLUNA 1: Visualização do Recorte (Esquerda) --- */}
        <div className="w-[35%] bg-black/50 border-r border-white/10 relative hidden md:flex flex-col items-center justify-center group overflow-hidden">
          
          {/* Imagem com Zoom on Hover */}
          <div className="w-full h-full relative overflow-hidden">
            <img 
              src={mockImageUrl} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" 
              alt="Original"
            />
            {/* Overlay Gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
          </div>

          {/* Botão Flutuante para Ler PDF */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-max z-20">
            <Button 
                onClick={() => setIsReadingPdf(true)}
                className="bg-blue-600/90 hover:bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] border border-blue-400/20 backdrop-blur-md transition-all hover:scale-105"
            >
                <BookOpen className="w-4 h-4 mr-2" /> 
                Ler Documento Original
            </Button>
          </div>

          {/* Badge de Origem */}
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-xs text-white/70 flex items-center gap-2 backdrop-blur-md border border-white/5">
            <Image className="w-3 h-3" /> 
            <span>Página 42 • Recorte Manual</span>
          </div>
        </div>

        {/* --- COLUNA 2: Conteúdo e IA (Centro) --- */}
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* Header da Nota */}
            <div className="mb-8">
              <div className="flex gap-2 mb-4 flex-wrap">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-widest bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 hover:bg-purple-500/20 cursor-default transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
              <DialogTitle className="text-3xl md:text-4xl font-bold leading-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
                {selectedNote.title}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <DialogDescription className="text-sm text-gray-500 font-mono flex items-center gap-2">
                  ID: {selectedNote.id}
                </DialogDescription>
                <span className="text-gray-700">•</span>
                <span className="text-xs text-gray-500">Adicionado em {new Date(selectedNote.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* AI Insight Card */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 mb-8 hover:border-white/20 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <FileText className="w-24 h-24 text-white" />
                </div>
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-3 relative z-10">
                <FileText className="w-4 h-4" /> Análise Semântica (IA)
              </h3>
              <p className="text-gray-300 leading-relaxed italic border-l-2 border-green-500/30 pl-4 relative z-10">
                "{selectedNote.preview}..."
              </p>
            </div>

            {/* Texto Completo Mock */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Transcrição
                <div className="h-px flex-1 bg-white/10 ml-4"></div>
              </h3>
              <div className="text-gray-400 leading-relaxed text-sm space-y-4 font-serif">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center backdrop-blur-sm">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
            <div className="flex gap-2">
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                    <ExternalLink className="w-4 h-4 mr-2" /> Fonte
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 border border-purple-500/50">
                <MessageCircle className="w-4 h-4 mr-2" /> Chat com IA
                </Button>
            </div>
          </div>
        </div>

        {/* --- COLUNA 3: Navegação Semântica (Direita) --- */}
        <div className="w-[280px] border-l border-white/10 bg-zinc-950/80 flex flex-col backdrop-blur-xl">
          <div className="p-5 border-b border-white/10 bg-zinc-900/50">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
              <Compass className="w-4 h-4" /> Próximos na Galáxia
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Baseado em distância vetorial</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {relatedNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => setSelectedNote(note)} // Navegação Interna: Troca o conteúdo do modal sem fechar
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 hover:border-white/30 border border-transparent cursor-pointer transition-all group"
              >
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white line-clamp-2 mb-2 leading-snug">
                  {note.title}
                </h4>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span className="text-[10px] text-gray-500 bg-black/30 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                    {note.tags[0]}
                  </span>
                  <span className="text-[9px] text-blue-500/70 font-mono">
                    {Math.floor(Math.random() * 100)}u dist
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