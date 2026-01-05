import { useEffect, useState, useRef } from "react"
import { 
  PdfLoader, 
  PdfHighlighter, 
  Highlight, 
  Popup, 
  AreaHighlight,
  type IHighlight,
} from "react-pdf-highlighter"
import * as pdfjs from "pdfjs-dist"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Loader2, 
  MessageSquare, 
  List, 
  ChevronRight, 
  Trash2,
  Sparkles 
} from "lucide-react"
import { usePdfStore } from "@/stores/pdfStore"
import type { Note } from "@/types/galaxy"
import api from "@/lib/api"
import { toast } from "sonner"

import "react-pdf-highlighter/dist/style.css"

/* ================= WORKER CONFIG ================= */
const pdfVersion = "3.11.174" 
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.js`
} catch (e) {
  console.error("Erro ao configurar PDF Worker:", e)
}

/* ================= TYPES ================= */
interface PdfReaderViewProps {
  note: Note
  pdfUrl: string
  initialPosition?: any
  onClose: () => void
}

interface Content {
  text?: string
  image?: string
}

/* ================= TIP COMPONENT ================= */
function HighlightTip({ onOpen, onConfirm }: { onOpen: () => void, onConfirm: (comment: { text: string; emoji: string }) => void }) {
  return (
    <div className="bg-zinc-900 border border-white/20 p-2 rounded-lg shadow-xl flex gap-2 z-[300] animate-in fade-in zoom-in-95 duration-200">
      <Button
        size="sm"
        className="h-8 text-xs bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-0 transition-colors"
        onClick={() => onConfirm({ text: "Marcado", emoji: "🖍️" })}
      >
        Marcar
      </Button>
      
      <Button 
        size="sm" 
        variant="ghost"
        className="h-8 text-xs text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
        onClick={() => {
            onConfirm({ text: "Analisar com IA", emoji: "🤖" })
            toast.info("Enviado para análise profunda...")
        }}
      >
        <Sparkles className="w-3 h-3 mr-1" /> IA
      </Button>

      <Button size="sm" variant="outline" className="h-8 text-xs border-white/20 hover:bg-white/10 text-gray-300" onClick={onOpen}>
        <MessageSquare className="w-3 h-3 mr-1" /> Comentar
      </Button>
    </div>
  )
}

/* ================= MAIN COMPONENT ================= */
export function PdfReaderView({ note, pdfUrl, initialPosition, onClose }: PdfReaderViewProps) {
  const { getHighlights, addHighlight, removeHighlight } = usePdfStore()
  const [highlights, setHighlights] = useState<IHighlight[]>([])
  
  const [zoom, setZoom] = useState(1.0) 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const highlighterRef = useRef<any>(null)

  useEffect(() => {
    setHighlights(getHighlights(note.id))
  }, [note.id, getHighlights])

  useEffect(() => {
    if (initialPosition && highlighterRef.current) {
        setTimeout(() => {
            highlighterRef.current.scrollTo(initialPosition)
        }, 1000)
    }
  }, [initialPosition])

  const handleCreateHighlight = async (highlight: IHighlight) => {
    addHighlight(note.id, highlight)
    setHighlights(prev => [...prev, highlight])

    try {
        if (highlight.content.text) {
            await api.post("/library/highlights", {
                fileHash: note.id,
                content: highlight.content.text,
                type: "TEXT",
                position: JSON.stringify(highlight.position) 
            })
            
            toast.success("Trecho salvo na Galáxia", { duration: 2000 })
        }
        else if (highlight.content.image) {
             await api.post("/library/highlights", {
                fileHash: note.id,
                content: "Image Content", 
                type: "IMAGE"
            })
             toast.success("Recorte enviado para análise visual")
        }

    } catch (error) {
        console.error("Erro ao salvar highlight:", error)
        toast.error("Erro de Sincronização")
    }
  }

  const scrollToHighlight = (highlight: IHighlight) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTo(highlight)
    }
  }

  const deleteHighlight = (id: string) => {
    removeHighlight(note.id, id)
    setHighlights(prev => prev.filter(h => h.id !== id))
  }

  return (
    // CORREÇÃO AQUI:
    // 1. fixed inset-x-0 bottom-0: Fixa nas laterais e embaixo
    // 2. top-16: Deixa 64px no topo (espaço do Header Global)
    // 3. z-50: Fica abaixo do Header Global (que é z-100)
    <div className="fixed inset-x-0 bottom-0 top-16 z-50 bg-zinc-950 flex flex-col border-t border-white/10 animate-in slide-in-from-bottom-10 duration-300">
      
      {/* HEADER DO PDF (Sub-header) */}
      <div className="h-14 border-b border-white/10 bg-black/90 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-white font-bold text-sm truncate max-w-md">{note.title}</h2>
            <span className="text-[10px] text-gray-500">PDF Reader • Connected</span>
          </div>
          
          <div className="flex items-center bg-white/5 rounded-md border border-white/10 ml-4">
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut className="w-3 h-3 text-gray-400" /></Button>
            <span className="text-xs w-12 text-center font-mono text-gray-300">{(zoom * 100).toFixed(0)}%</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => setZoom(z => Math.min(3.0, z + 0.25))}><ZoomIn className="w-3 h-3 text-gray-400" /></Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={isSidebarOpen ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-xs"
          >
            <List className="w-4 h-4 mr-2" />
            Marcações ({highlights.length})
          </Button>

          <Button size="icon" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-400">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* BODY (Onde o PDF Renderiza) */}
      <div className="flex-1 relative bg-zinc-900 w-full h-full flex overflow-hidden">
        
        {/* PDF CONTAINER */}
        <div className="flex-1 relative h-full overflow-auto bg-gray-900/50 flex justify-center">
            <div style={{ position: 'relative', width: `${60 * zoom}vw`, minWidth: '600px', marginBottom: '50px' }}>
                <PdfLoader 
                    url={pdfUrl} 
                    beforeLoad={<div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-400"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/><p>Carregando documento...</p></div>}
                    errorMessage={<div className="flex items-center justify-center h-96 text-red-400 p-4">Erro ao carregar PDF.</div>}
                >
                    {(pdfDocument) => (
                        <PdfHighlighter
                            pdfDocument={pdfDocument}
                            enableAreaSelection={(event) => event.altKey}
                            onScrollChange={() => {}}
                            scrollRef={() => {}}
                            ref={highlighterRef}
                            onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => (
                                <HighlightTip
                                    onOpen={transformSelection}
                                    onConfirm={(comment) => {
                                        handleCreateHighlight({ 
                                            content, 
                                            position, 
                                            comment, 
                                            id: crypto.randomUUID() 
                                        })
                                        hideTipAndSelection()
                                    }}
                                />
                            )}
                            highlightTransform={(highlight, index, setTip, hideTip, _viewportToScaled, screenshot, isScrolledTo) => {
                                const isTextHighlight = !Boolean(highlight.content && (highlight.content as Content).image);
                                const component = isTextHighlight 
                                    ? <Highlight isScrolledTo={isScrolledTo} position={highlight.position} comment={highlight.comment} />
                                    : <AreaHighlight isScrolledTo={isScrolledTo} highlight={highlight} onChange={() => {}} />;

                                return (
                                    <Popup
                                        popupContent={<div className="text-black text-xs p-2 bg-white rounded shadow border border-gray-200 z-[300]">{highlight.comment?.text || ""}</div>}
                                        onMouseOver={(popupContent) => setTip(highlight, (highlight) => popupContent)}
                                        onMouseOut={hideTip}
                                        key={index}
                                    >{component}</Popup>
                                );
                            }}
                            highlights={highlights}
                        />
                    )}
                </PdfLoader>
            </div>
        </div>

        {/* SIDEBAR */}
        {isSidebarOpen && (
            <div className="w-80 bg-[#0a0a0a] border-l border-white/10 h-full flex flex-col animate-in slide-in-from-right duration-300 z-[201] absolute right-0 top-0 bottom-0 md:relative shadow-2xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur">
                    <h3 className="font-semibold text-white text-sm">Anotações</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSidebarOpen(false)}>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                    {highlights.length === 0 ? (
                        <div className="text-center text-gray-500 text-xs mt-10">Nenhuma marcação feita.<br/>Selecione um texto para começar.</div>
                    ) : (
                        <div className="space-y-3 pb-10">
                            {highlights.map((h, i) => (
                                <div 
                                    key={h.id} 
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors group cursor-pointer"
                                    onClick={() => scrollToHighlight(h)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1 rounded">Pág. {h.position.pageNumber}</span>
                                        <Trash2 className="w-3 h-3 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); deleteHighlight(h.id) }} />
                                    </div>
                                    {h.content.text ? (
                                        <blockquote className="text-xs text-gray-300 border-l-2 border-yellow-500/50 pl-2 italic line-clamp-3">"{h.content.text}"</blockquote>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-gray-400 italic"><div className="w-4 h-4 bg-yellow-500/20 rounded" />[Área de Imagem]</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        )}
      </div>
    </div>
  )
}