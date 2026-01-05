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
import ReactMarkdown from 'react-markdown' 

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  X, ZoomIn, ZoomOut, Loader2, MessageSquare, 
  List, ChevronRight, Trash2, Sparkles, RefreshCw
} from "lucide-react"
import { usePdfStore } from "@/stores/pdfStore"
import type { Note } from "@/types/galaxy"
import api from "@/lib/api"
import { toast } from "sonner"

import "react-pdf-highlighter/dist/style.css"

const pdfVersion = "3.11.174" 
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.js`
} catch (e) {
  console.error("Erro config PDF:", e)
}

interface PdfReaderViewProps {
  note: Note
  pdfUrl: string
  initialPosition?: any
  onClose: () => void
}

function HighlightTip({ onOpen, onConfirm }: { onOpen: () => void, onConfirm: (action: 'highlight' | 'summarize') => void }) {
  return (
    <div className="bg-zinc-900 border border-white/20 p-2 rounded-lg shadow-xl flex gap-2 z-[300] animate-in fade-in zoom-in-95 duration-200">
      <Button
        size="sm"
        className="h-8 text-xs bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-0"
        onClick={() => onConfirm('highlight')}
      >
        Marcar
      </Button>
      
      <Button 
        size="sm" 
        className="h-8 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-0"
        onClick={() => onConfirm('summarize')}
      >
        <Sparkles className="w-3 h-3 mr-1" /> Resumir
      </Button>

      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400" onClick={onOpen}>
        <MessageSquare className="w-4 h-4" />
      </Button>
    </div>
  )
}

export function PdfReaderView({ note, pdfUrl, initialPosition, onClose }: PdfReaderViewProps) {
  const { getHighlights, addHighlight, removeHighlight } = usePdfStore()
  const [highlights, setHighlights] = useState<IHighlight[]>([])
  const [summaries, setSummaries] = useState<any[]>([]) 
  const [activeTab, setActiveTab] = useState("highlights")
  
  const [zoom, setZoom] = useState(1.0) 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false)

  const highlighterRef = useRef<any>(null)

  useEffect(() => {
    setHighlights(getHighlights(note.id))
    fetchSummaries()
  }, [note.id])

  const fetchSummaries = async () => {
      try {
          setIsLoadingSummaries(true)
          const { data } = await api.get(`/library/summaries/${note.id}`)
          setSummaries(data)
      } catch (e) {
          console.error("Erro ao buscar resumos", e)
      } finally {
          setIsLoadingSummaries(false)
      }
  }

  const handleSelectionAction = async (highlight: IHighlight, action: 'highlight' | 'summarize') => {
    const text = highlight.content.text;
    if (!text) return;

    if (action === 'highlight') {
        addHighlight(note.id, highlight)
        setHighlights(prev => [...prev, highlight])
        try {
            await api.post("/library/highlights", {
                fileHash: note.id,
                content: text,
                type: "TEXT",
                position: JSON.stringify(highlight.position) 
            })
            toast.success("Trecho salvo")
        } catch (e) { toast.error("Erro ao salvar") }
    } 
    else if (action === 'summarize') {
        try {
            toast.info("Solicitando análise da IA...", { description: "Isso pode levar alguns segundos." })
            
            await api.post("/library/summaries", {
                fileHash: note.id,
                sourceType: "TEXT_SELECTION",
                content: text
            })
            
            setIsSidebarOpen(true)
            setActiveTab("summaries")
            fetchSummaries()

        } catch (e) {
            toast.error("Falha ao solicitar resumo")
        }
    }
  }

  const scrollToHighlight = (highlight: IHighlight) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTo(highlight)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-50 bg-zinc-950 flex flex-col border-t border-white/10 animate-in slide-in-from-bottom-10 duration-300">
      
      {/* HEADER */}
      <div className="h-14 border-b border-white/10 bg-black/90 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-white font-bold text-sm truncate max-w-md">{note.title}</h2>
            <span className="text-[10px] text-gray-500">Logos AI Reader</span>
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
            className="text-xs gap-2"
          >
            <List className="w-4 h-4" /> 
            {isSidebarOpen ? "Fechar Painel" : "Ver Notas & IA"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-400">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 relative bg-zinc-900 w-full h-full flex overflow-hidden">
        
        {/* PDF */}
        <div className="flex-1 relative h-full overflow-auto bg-gray-900/50 flex justify-center">
            <div style={{ position: 'relative', width: `${60 * zoom}vw`, minWidth: '600px', marginBottom: '50px' }}>
                <PdfLoader url={pdfUrl} beforeLoad={<div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-400"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/><p>Carregando...</p></div>}>
                    {(pdfDocument) => (
                        <PdfHighlighter
                            pdfDocument={pdfDocument}
                            enableAreaSelection={(event) => event.altKey}
                            scrollRef={() => {}}
                            // CORREÇÃO: Adicionado onScrollChange vazio para satisfazer o TS
                            onScrollChange={() => {}}
                            ref={highlighterRef}
                            onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => (
                                <HighlightTip 
                                    onOpen={transformSelection} 
                                    onConfirm={(action) => { 
                                        handleSelectionAction({ content, position, comment: { text: "", emoji: "" }, id: crypto.randomUUID() }, action); 
                                        hideTipAndSelection() 
                                    }} 
                                />
                            )}
                            highlightTransform={(highlight, index, setTip, hideTip, _, __, isScrolledTo) => {
                                const component = <Highlight isScrolledTo={isScrolledTo} position={highlight.position} comment={highlight.comment} />;
                                return <Popup popupContent={<div className="text-black text-xs p-2 bg-white rounded">{highlight.comment?.text}</div>} onMouseOver={(content) => setTip(highlight, () => content)} onMouseOut={hideTip} key={index}>{component}</Popup>;
                            }}
                            highlights={highlights}
                        />
                    )}
                </PdfLoader>
            </div>
        </div>

        {/* SIDEBAR */}
        {isSidebarOpen && (
            <div className="w-96 bg-[#0a0a0a] border-l border-white/10 h-full flex flex-col z-[201] absolute right-0 top-0 bottom-0 md:relative shadow-2xl">
                
                <div className="flex border-b border-white/10">
                    <button 
                        onClick={() => setActiveTab("highlights")}
                        className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === "highlights" ? "text-white border-b-2 border-blue-500 bg-white/5" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        Marcações ({highlights.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("summaries")}
                        className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === "summaries" ? "text-white border-b-2 border-purple-500 bg-white/5" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        Resumos IA ({summaries.length})
                    </button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {activeTab === "highlights" && (
                        <div className="space-y-3">
                            {highlights.map((h) => (
                                <div key={h.id} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 cursor-pointer" onClick={() => scrollToHighlight(h)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded">Pág. {h.position.pageNumber}</span>
                                        <Trash2 className="w-3 h-3 text-gray-600 hover:text-red-400" onClick={(e) => { e.stopPropagation(); removeHighlight(note.id, h.id); setHighlights(p => p.filter(x => x.id !== h.id)) }} />
                                    </div>
                                    <blockquote className="text-xs text-gray-300 border-l-2 border-yellow-500/50 pl-2 italic line-clamp-3">"{h.content.text}"</blockquote>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "summaries" && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button size="sm" variant="ghost" onClick={fetchSummaries} disabled={isLoadingSummaries}>
                                    <RefreshCw className={`w-3 h-3 ${isLoadingSummaries ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            
                            {summaries.map((s: any) => (
                                <div key={s.id} className="bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                                            {s.sourceType === 'TEXT_SELECTION' ? 'Seleção' : 'Intervalo'}
                                        </span>
                                        {s.status === 'PENDING' ? (
                                            <span className="flex items-center gap-1 text-[10px] text-yellow-500"><Loader2 className="w-3 h-3 animate-spin"/> Gerando...</span>
                                        ) : (
                                            <span className="text-[10px] text-green-500">Concluído</span>
                                        )}
                                    </div>
                                    
                                    {s.status === 'COMPLETED' ? (
                                        <div className="prose prose-invert prose-sm text-xs text-gray-300">
                                            <ReactMarkdown>{s.generatedText}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">A IA está lendo e sintetizando...</p>
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