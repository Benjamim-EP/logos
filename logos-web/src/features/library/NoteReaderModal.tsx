import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useSelectionStore } from "@/stores/selectionStore"
import { 
  Calendar, 
  ExternalLink, 
  Trash2, 
  Clock,
  Shield,
  FileText,
  FileSearch
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import api from "@/lib/api"
import { toast } from "sonner"
import { stringToColor } from "@/lib/colors"
import ReactMarkdown from 'react-markdown'

export function NoteReaderModal() {
  const { selectedNote, setSelectedNote } = useSelectionStore()
  const [explorerState, setExplorerState] = useState<{ url: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOpen = !!selectedNote

  const handleOpenOriginal = async () => {
    if (!selectedNote?.documentId) return;
    try {
        toast.loading("Acessando arquivo original...", { id: "modal-open" })
        const { data } = await api.get(`/library/books/${selectedNote.documentId}/content`)
        setExplorerState({ url: data.url })
        toast.dismiss("modal-open")
    } catch (err) {
        toast.dismiss("modal-open")
        toast.error("Erro ao carregar documento.")
    }
  }

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!confirm("Excluir esta nota permanentemente?")) return;

    setIsDeleting(true);
    try {
        const isResume = selectedNote.id.startsWith("summary-") || selectedNote.tags?.includes("RESUME");
        const cleanId = selectedNote.id.replace("summary-", "");

        if (isResume) {
            await api.delete(`/library/summaries/${cleanId}`);
        } else {
            await api.delete(`/library/highlights/${cleanId}`);
        }

        toast.success("Nota removida.");
        setSelectedNote(null);
        window.dispatchEvent(new Event('refresh-galaxy')); 
    } catch (e) {
        toast.error("Erro ao excluir.");
    } finally {
        setIsDeleting(false);
    }
  }

  if (!selectedNote) return null

  if (explorerState) {
    return (
      <PdfReaderView 
        note={selectedNote}
        pdfUrl={explorerState.url}
        initialPosition={selectedNote.position}
        onClose={() => setExplorerState(null)}
      />
    )
  }

  const docColor = stringToColor(selectedNote.documentId || "default");
  const isResume = selectedNote.id.startsWith("summary-") || selectedNote.tags?.includes("RESUME");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setSelectedNote(null)}>
      {/* REDUZIDO: max-w-2xl para um visual mais focado */}
      <DialogContent className="max-w-2xl bg-[#0a0a0a] border-white/10 text-white p-0 overflow-hidden shadow-2xl z-[150] outline-none">
        
        <div className="flex flex-col h-auto max-h-[85vh]">
          
          {/* HEADER COMPACTO */}
          <div className="p-6 border-b border-white/5 bg-zinc-900/20">
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    {selectedNote.tags?.filter(t => t !== "organized").map(tag => (
                    <span 
                        key={tag} 
                        className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10"
                        style={{ borderColor: tag === "RESUME" ? "#06b6d4" : "" }}
                    >
                        {tag}
                    </span>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500">
                    <Shield className={`w-3.5 h-3.5 ${isResume ? 'text-cyan-500' : 'text-blue-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Vetorizado</span>
                </div>
            </div>

            <DialogTitle className="text-xl font-bold text-white tracking-tight mb-2">
                {isResume ? "Resumo Semântico" : "Destaque do Documento"}
            </DialogTitle>
            
            <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[250px]">{selectedNote.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(selectedNote.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
          </div>

          {/* CONTEÚDO */}
          <ScrollArea className="flex-1 p-6">
            <div 
                className="bg-zinc-900/40 border-l-2 p-6 rounded-r-xl leading-relaxed text-zinc-200" 
                style={{ borderColor: docColor }}
            >
              {isResume ? (
                  <div className="markdown-content prose-invert text-sm">
                      <ReactMarkdown>{selectedNote.preview}</ReactMarkdown>
                  </div>
              ) : (
                  <p className="italic text-base font-serif opacity-90">
                    "{selectedNote.preview}"
                  </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Página {selectedNote.position?.pageNumber || "N/A"}</span>
                </div>
                
                <Button 
                    variant="link" 
                    onClick={handleOpenOriginal}
                    className="text-blue-400 hover:text-blue-300 text-[11px] h-auto p-0 gap-1.5"
                >
                    <FileSearch className="w-3.5 h-3.5" /> Ir para o contexto original
                </Button>
            </div>
          </ScrollArea>

          {/* FOOTER DE AÇÕES */}
          <div className="p-4 border-t border-white/5 bg-[#050505] flex justify-between items-center px-6">
            <Button 
                variant="ghost" 
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-zinc-600 hover:text-red-500 hover:bg-red-500/5 h-8 text-[10px] uppercase font-bold tracking-widest"
            >
                <Trash2 className="w-3 h-3 mr-2" /> Excluir Nota
            </Button>

            <div className="text-[9px] text-zinc-800 font-mono tracking-[0.2em]">
                LOGOS SYSTEM
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}