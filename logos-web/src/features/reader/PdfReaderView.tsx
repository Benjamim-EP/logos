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
  List, ChevronRight, Trash2, Sparkles, RefreshCw, 
  MousePointer2, TextCursor 
} from "lucide-react"
import { usePdfStore } from "@/stores/pdfStore"
import type { Note } from "@/types/galaxy"
import api from "@/lib/api"
import { toast } from "sonner"

import "react-pdf-highlighter/dist/style.css"

// Configuração do Worker do PDF.js
const pdfVersion = "3.11.174" 
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.js`
} catch (e) { console.error("Erro config PDF:", e) }

interface PdfReaderViewProps {
  note: Note
  pdfUrl: string
  initialPosition?: any
  onClose: () => void
}

// Menu Flutuante ao Selecionar Texto
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
        className="h-8 text-xs bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border-0"
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
  
  const [visualHighlights, setVisualHighlights] = useState<IHighlight[]>([])
  const [summaries, setSummaries] = useState<any[]>([]) 
  const [activeTab, setActiveTab] = useState("highlights")
  
  const [interactionMode, setInteractionMode] = useState<'select' | 'interact'>('select')
  
  const [zoom, setZoom] = useState(1.0) 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false)

  const highlighterRef = useRef<any>(null)

  useEffect(() => {
    fetchData()
  }, [note.id])

  useEffect(() => {
    if (initialPosition && highlighterRef.current) {
        setTimeout(() => {
            highlighterRef.current.scrollTo(initialPosition)
        }, 1000)
    }
  }, [initialPosition])

  const fetchData = async () => {
      const localHighlights = getHighlights(note.id)
      let remoteSummaries: any[] = []
      try {
          setIsLoadingSummaries(true)
          const { data } = await api.get(`/library/summaries/${note.id}`)
          setSummaries(data)
          remoteSummaries = data;
      } catch (e) {
          console.error(e)
      } finally {
          setIsLoadingSummaries(false)
      }

      const summaryHighlights = remoteSummaries
        .filter(s => s.positionJson)
        .map(s => {
            let pos;
            try { pos = JSON.parse(s.positionJson) } catch (e) { return null }
            if (!pos) return null;

            return {
                id: `summary-${s.id}`,
                position: pos,
                content: { text: "Resumo IA" },
                comment: { text: s.generatedText, emoji: "🤖" },
                isSummary: true,
                dbId: s.id
            } as any
        })
        .filter(Boolean)

      setVisualHighlights([...localHighlights, ...summaryHighlights])
  }

  const handleSelectionAction = async (highlight: IHighlight, action: 'highlight' | 'summarize') => {
    const text = highlight.content.text;
    if (!text) return;
    const positionStr = JSON.stringify(highlight.position);

    if (action === 'highlight') {
        addHighlight(note.id, highlight)
        setVisualHighlights(prev => [...prev, highlight])
        try {
            await api.post("/library/highlights", {
                fileHash: note.id,
                content: text,
                type: "TEXT",
                position: positionStr
            })
            toast.success("Trecho salvo")
        } catch (e) { toast.error("Erro ao salvar") }
    } 
    else if (action === 'summarize') {
        try {
            toast.info("IA lendo trecho...", { description: "Gerando resumo..." })
            
            await api.post("/library/summaries", {
                fileHash: note.id,
                sourceType: "TEXT_SELECTION",
                content: text,
                position: positionStr 
            })
            
            setIsSidebarOpen(true)
            setActiveTab("summaries")
            
            setTimeout(fetchData, 1000) 

        } catch (e) {
            toast.error("Falha ao solicitar resumo")
        }
    }
  }

  const handleDeleteSummary = async (summaryId: number) => {
      try {
          await api.delete(`/library/summaries/${summaryId}`)
          toast.success("Resumo apagado")
          fetchData()
      } catch (e) { toast.error("Erro ao apagar") }
  }

  const handleDeleteHighlight = async (h: IHighlight) => {
      removeHighlight(note.id, h.id)
      setVisualHighlights(prev => prev.filter(x => x.id !== h.id))
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-50 bg-zinc-950 flex flex-col border-t border-white/10 animate-in slide-in-from-bottom-10 duration-300">
      
      <div className="h-14 border-b border-white/10 bg-black/90 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-white font-bold text-sm truncate max-w-md">{note.title}</h2>
            <span className="text-[10px] text-gray-500">Logos AI Reader</span>
          </div>
          
          <div className="flex items-center bg-white/5 rounded-md border border-white/10 ml-4 p-1 gap-2">
            <div className="flex items-center bg-black/50 rounded p-0.5 border border-white/5 mr-2">
                <button 
                    onClick={() => setInteractionMode('select')}
                    className={`p-1.5 rounded ${interactionMode === 'select' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Modo Seleção (Criar)"
                >
                    <TextCursor className="w-3 h-3" />
                </button>
                <button 
                    onClick={() => setInteractionMode('interact')}
                    className={`p-1.5 rounded ${interactionMode === 'interact' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Modo Interação (Ler Resumos)"
                >
                    <MousePointer2 className="w-3 h-3" />
                </button>
            </div>

            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut className="w-3 h-3" /></Button>
            <span className="text-xs w-8 text-center font-mono text-gray-300">{(zoom * 100).toFixed(0)}%</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setZoom(z => Math.min(3.0, z + 0.25))}><ZoomIn className="w-3 h-3" /></Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={isSidebarOpen ? "secondary" : "ghost"} size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-xs gap-2">
            <List className="w-4 h-4" /> 
            {isSidebarOpen ? "Fechar Painel" : "Ver Notas & IA"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-400"><X className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="flex-1 relative bg-zinc-900 w-full h-full flex overflow-hidden">
        
        <div className="flex-1 relative h-full overflow-auto bg-gray-900/50 flex justify-center">
            <div style={{ position: 'relative', width: `${60 * zoom}vw`, minWidth: '600px', marginBottom: '50px' }}>
                <PdfLoader 
                    url={pdfUrl} 
                    beforeLoad={<div className="flex h-96 items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/> Carregando PDF...</div>}
                >
                    {(pdfDocument) => (
                        <PdfHighlighter
                            pdfDocument={pdfDocument}
                            enableAreaSelection={(event) => interactionMode === 'select' && event.altKey}
                            onScrollChange={() => {}}
                            scrollRef={() => {}}
                            ref={highlighterRef}
                            
                            onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => (
                                interactionMode === 'select' ? (
                                    <HighlightTip 
                                        onOpen={transformSelection} 
                                        onConfirm={(action) => { 
                                            handleSelectionAction({ content, position, comment: { text: "", emoji: "" }, id: crypto.randomUUID() }, action); 
                                            hideTipAndSelection() 
                                        }} 
                                    />
                                ) : null
                            )}
                            
                            // CORREÇÃO CRÍTICA AQUI: Separando Highlight de AreaHighlight
                            highlightTransform={(highlight, index, setTip, hideTip, _, __, isScrolledTo) => {
                                const isSummary = (highlight as any).isSummary;
                                const isTextHighlight = !Boolean(highlight.content && highlight.content.image);

                                const containerClass = isSummary 
                                    ? "absolute inset-0 bg-cyan-500/10 border-b-2 border-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-colors" 
                                    : "";

                                const handleSummaryClick = () => {
                                    if (isSummary) {
                                        setIsSidebarOpen(true);
                                        setActiveTab("summaries");
                                        toast.info("Resumo da IA selecionado");
                                    }
                                };

                                const component = (
                                    <div className={containerClass} onClick={handleSummaryClick}>
                                        {isTextHighlight ? (
                                            <Highlight 
                                                isScrolledTo={isScrolledTo} 
                                                position={highlight.position} 
                                                comment={highlight.comment} 
                                            />
                                        ) : (
                                            <AreaHighlight
                                                isScrolledTo={isScrolledTo}
                                                highlight={highlight}
                                                onChange={() => {}} // Callback vazio para satisfazer o tipo
                                            />
                                        )}
                                    </div>
                                );

                                return (
                                    <Popup 
                                        popupContent={
                                            <div className="text-black text-xs p-2 bg-white rounded shadow max-w-xs">
                                                {isSummary ? "✨ Clique para ver o resumo da IA" : highlight.comment?.text}
                                            </div>
                                        } 
                                        onMouseOver={(content) => setTip(highlight, () => content)} 
                                        onMouseOut={hideTip} 
                                        key={index}
                                    >
                                        {component}
                                    </Popup>
                                );
                            }}
                            highlights={visualHighlights}
                        />
                    )}
                </PdfLoader>
            </div>
        </div>

        {isSidebarOpen && (
            <div className="w-96 bg-[#0a0a0a] border-l border-white/10 h-full flex flex-col z-[201] absolute right-0 top-0 bottom-0 md:relative shadow-2xl">
                
                <div className="flex border-b border-white/10">
                    <button 
                        onClick={() => setActiveTab("highlights")}
                        className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === "highlights" ? "text-blue-400 border-b-2 border-blue-500 bg-white/5" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        Marcações ({visualHighlights.filter((h:any) => !h.isSummary).length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("summaries")}
                        className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === "summaries" ? "text-cyan-400 border-b-2 border-cyan-500 bg-white/5" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        Resumos IA ({summaries.length})
                    </button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {activeTab === "summaries" && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button size="sm" variant="ghost" onClick={fetchData} disabled={isLoadingSummaries}>
                                    <RefreshCw className={`w-3 h-3 ${isLoadingSummaries ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            
                            {summaries.length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-10">
                                    Selecione um texto no PDF e clique em "Resumir" para gerar inteligência.
                                </div>
                            )}

                            {summaries.map((s: any) => (
                                <div key={s.id} className="bg-gradient-to-br from-cyan-900/10 to-transparent border border-cyan-500/20 rounded-lg p-4 group relative hover:border-cyan-500/40 transition-colors">
                                    <button 
                                        onClick={() => handleDeleteSummary(s.id)}
                                        className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Apagar Resumo"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>

                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                                            {s.sourceType === 'TEXT_SELECTION' ? 'Seleção' : 'Intervalo'}
                                        </span>
                                        {s.status === 'PENDING' ? (
                                            <span className="flex items-center gap-1 text-[10px] text-yellow-500"><Loader2 className="w-3 h-3 animate-spin"/> Gerando</span>
                                        ) : (
                                            <span className="text-[10px] text-green-500 font-mono">Concluído</span>
                                        )}
                                    </div>
                                    
                                    {s.status === 'COMPLETED' ? (
                                        <div className="prose prose-invert prose-sm text-xs text-gray-300 max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">
                                            <ReactMarkdown>{s.generatedText}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">A IA está lendo e sintetizando o conteúdo...</p>
                                    )}
                                    
                                    <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-600 flex justify-between">
                                        <span>{new Date(s.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "highlights" && (
                        <div className="space-y-3">
                            {visualHighlights.filter((h: any) => !h.isSummary).map((h) => (
                                <div 
                                    key={h.id} 
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 cursor-pointer group"
                                    onClick={() => { if(highlighterRef.current) highlighterRef.current.scrollTo(h) }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded font-mono">
                                            Pág. {h.position.pageNumber}
                                        </span>
                                        <Trash2 
                                            className="w-3 h-3 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(h) }} 
                                        />
                                    </div>
                                    <blockquote className="text-xs text-gray-300 border-l-2 border-yellow-500/50 pl-2 italic line-clamp-3 leading-relaxed">
                                        "{h.content.text}"
                                    </blockquote>
                                </div>
                            ))}
                            {visualHighlights.filter((h: any) => !h.isSummary).length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-10">
                                    Nenhuma marcação encontrada.
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>
        )}
      </div>
    </div>
  )
}