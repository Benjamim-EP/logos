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
  MousePointer2, TextCursor, Columns, ArrowRightToLine
} from "lucide-react"

import { useWorkbenchStore } from "@/stores/workbenchStore" // Store do Workbench

// Components
import { LogosWorkbench } from "@/features/workbench/LogosWorkbench" // Componente do Canvas

// Utils & Types
import type { Note } from "@/types/galaxy"
import api from "@/lib/api"
import { toast } from "sonner"

import "react-pdf-highlighter/dist/style.css"

// Configuração do Worker do PDF.js (Versão estável para esta lib)
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
        className="h-8 text-xs bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-0 transition-colors"
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
  
  // Estados de Dados
  const [visualHighlights, setVisualHighlights] = useState<IHighlight[]>([])
  const [summaries, setSummaries] = useState<any[]>([]) 
  const [activeTab, setActiveTab] = useState("highlights")
  
  // Estados de Interface
  const [interactionMode, setInteractionMode] = useState<'select' | 'interact'>('select')
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false) // <--- Estado do Workbench
  const [zoom, setZoom] = useState(1.0) 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false)

  const { addNode } = useWorkbenchStore() // Hook para adicionar cards ao Workbench
  const highlighterRef = useRef<any>(null)

  // 1. Carregar dados REAIS do Banco ao abrir
  useEffect(() => {
    fetchData()
  }, [note.id])

  // 2. Auto-scroll se vier da Galáxia
  useEffect(() => {
    if (initialPosition && highlighterRef.current) {
        setTimeout(() => {
            highlighterRef.current.scrollTo(initialPosition)
        }, 1000)
    }
  }, [initialPosition])

  useEffect(() => {
    const handleScrollRequest = (e: Event) => {
        const customEvent = e as CustomEvent
        const position = customEvent.detail
        
        // Verifica se o highlighter e a posição existem
        if (position && highlighterRef.current) {
            try {
                // CORREÇÃO CRÍTICA:
                // A biblioteca espera um objeto { position: ... } e não a posição direta.
                // Criamos um objeto "fake" que satisfaz a estrutura que o scrollTo espera.
                const highlightWrapper = { position: position, content: {}, comment: {} } as any;
                
                highlighterRef.current.scrollTo(highlightWrapper)
            } catch (err) {
                console.warn("Falha ao rolar PDF (posição inválida ou PDF não carregado).", err)
            }
        }
    }

    window.addEventListener('workbench-scroll-pdf', handleScrollRequest)
    return () => window.removeEventListener('workbench-scroll-pdf', handleScrollRequest)
  }, [])

  const fetchData = async () => {
      try {
          setIsLoadingSummaries(true)
          
          // Busca Resumos
          const resSummaries = await api.get(`/library/summaries/${note.id}`)
          setSummaries(resSummaries.data)
          
          // Busca Highlights
          const resHighlights = await api.get(`/library/books/${note.id}/highlights`)
          
          const dbHighlights = resHighlights.data.map((h: any) => {
             let pos = null;
             try { pos = JSON.parse(h.positionJson) } catch(e) {}
             if(!pos) return null;

             return {
                 id: String(h.id),
                 position: pos,
                 content: { text: h.content },
                 comment: { text: "", emoji: "" },
                 isSummary: false
             }
          }).filter(Boolean)

          const summaryHighlights = resSummaries.data
            .filter((s: any) => s.positionJson)
            .map((s: any) => {
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

          setVisualHighlights([...dbHighlights, ...summaryHighlights])

      } catch (e) {
          console.error(e)
      } finally {
          setIsLoadingSummaries(false)
      }
  }

  const handleSelectionAction = async (highlight: IHighlight, action: 'highlight' | 'summarize') => {
    const text = highlight.content.text;
    if (!text) return;
    const positionStr = JSON.stringify(highlight.position);

    if (action === 'highlight') {
        try {
            const { data: newId } = await api.post("/library/highlights", {
                fileHash: note.id,
                content: text,
                type: "TEXT",
                position: positionStr
            })
            
            const newHighlight = { ...highlight, id: String(newId) }
            setVisualHighlights(prev => [...prev, newHighlight])
            toast.success("Trecho salvo")
            window.dispatchEvent(new Event('refresh-galaxy'));

        } catch (e) { 
            console.error(e)
            toast.error("Erro ao salvar marcação.") 
        }
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
            window.dispatchEvent(new Event('refresh-galaxy'));
            setTimeout(fetchData, 2000) 

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
          window.dispatchEvent(new Event('refresh-galaxy'));
      } catch (e) { toast.error("Erro ao apagar") }
  }

  const handleDeleteHighlight = async (h: IHighlight) => {
      try {
          await api.delete(`/library/highlights/${h.id}`)
          setVisualHighlights(prev => prev.filter(x => x.id !== h.id))
          toast.success("Marcação removida")
          window.dispatchEvent(new Event('refresh-galaxy'));
      } catch (e) {
          toast.error("Erro ao excluir.")
      }
  }

  // --- Função para enviar item para o Workbench ---
  const sendToWorkbench = (item: any, type: 'highlight' | 'summary') => {
    const content = type === 'highlight' ? item.content.text : item.generatedText;
    const dbId = type === 'highlight' ? item.id : item.id;
    
    // O item.position já é o objeto {boundingRect, rects, pageNumber}
    // Precisamos passá-lo para o nó
    const positionPdf = item.position; 

    const newNode = {
        id: `${type}-${dbId}-${Date.now()}`, 
        type: 'custom',
        position: { x: 400 + Math.random() * 100, y: 300 + Math.random() * 100 },
        data: {
            label: note.title,
            content: content,
            type: type,
            dbId: dbId,
            positionPdf: item.position,
            fileHash: note.id 
        }
    }
    
    // @ts-ignore
    addNode(newNode)
    toast.success("Adicionado ao Workbench", { icon: "🧩" })
    
    if (!isWorkbenchOpen) setIsWorkbenchOpen(true)
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
          
          <div className="flex items-center bg-white/5 rounded-md border border-white/10 ml-4 p-1 gap-2">
            <div className="flex items-center bg-black/50 rounded p-0.5 border border-white/5 mr-2">
                <button 
                    onClick={() => setInteractionMode('select')}
                    className={`p-1.5 rounded ${interactionMode === 'select' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Modo Seleção"
                >
                    <TextCursor className="w-3 h-3" />
                </button>
                <button 
                    onClick={() => setInteractionMode('interact')}
                    className={`p-1.5 rounded ${interactionMode === 'interact' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Modo Interação"
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
            
          {/* BOTÃO TOGGLE WORKBENCH */}
          <Button 
            variant={isWorkbenchOpen ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setIsWorkbenchOpen(!isWorkbenchOpen)} 
            className="text-xs gap-2 hidden md:flex"
          >
            <Columns className="w-4 h-4" /> 
            {isWorkbenchOpen ? "Fechar Canvas" : "Workbench"}
          </Button>

          <Button variant={isSidebarOpen ? "secondary" : "ghost"} size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-xs gap-2">
            <List className="w-4 h-4" /> 
            {isSidebarOpen ? "Fechar Painel" : "Painel"}
          </Button>
          
          <div className="w-px h-6 bg-white/10 mx-2" />

          <Button size="icon" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-400"><X className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* BODY (SPLIT VIEW) */}
      <div className="flex-1 relative bg-zinc-900 w-full h-full flex overflow-hidden">
        
        {/* PDF CONTAINER (LADO ESQUERDO) */}
        <div className={`relative h-full overflow-auto bg-gray-900/50 flex justify-center transition-all duration-300 ${isWorkbenchOpen ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
            <div style={{ position: 'relative', width: isWorkbenchOpen ? '95%' : `${60 * zoom}vw`, minWidth: '400px', marginBottom: '50px' }}>
                <PdfLoader url={pdfUrl} beforeLoad={<div className="flex h-96 items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/> Carregando PDF...</div>}>
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
                                    }
                                };

                                const component = (
                                    <div className={containerClass} onClick={handleSummaryClick}>
                                        {isTextHighlight ? (
                                            <Highlight isScrolledTo={isScrolledTo} position={highlight.position} comment={highlight.comment} />
                                        ) : (
                                            <AreaHighlight isScrolledTo={isScrolledTo} highlight={highlight} onChange={() => {}} />
                                        )}
                                    </div>
                                );

                                return (
                                    <Popup 
                                        popupContent={
                                            <div className="text-black text-xs p-2 bg-white rounded shadow max-w-xs">
                                                {isSummary ? "✨ Resumo IA" : "Anotação"}
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

        {/* WORKBENCH (LADO DIREITO) */}
        {isWorkbenchOpen && (
            <div className="w-1/2 h-full bg-[#111]">
                {/* Renderiza o Canvas */}
                <LogosWorkbench fileHash={note.id} />
            </div>
        )}

        {/* SIDEBAR COM BOTÕES DE ENVIO */}
        {isSidebarOpen && (
            <div className="w-96 bg-[#0a0a0a] border-l border-white/10 h-full flex flex-col z-[201] absolute right-0 top-0 bottom-0 md:relative shadow-2xl">
                
                <div className="flex border-b border-white/10">
                    <button onClick={() => setActiveTab("highlights")} className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === "highlights" ? "text-blue-400 border-b-2 border-blue-500 bg-white/5" : "text-gray-500 hover:text-gray-300"}`}>
                        Marcações ({visualHighlights.filter((h:any) => !h.isSummary).length})
                    </button>
                    <button onClick={() => setActiveTab("summaries")} className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === "summaries" ? "text-cyan-400 border-b-2 border-cyan-500 bg-white/5" : "text-gray-500 hover:text-gray-300"}`}>
                        Resumos ({summaries.length})
                    </button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {/* RESUMOS */}
                    {activeTab === "summaries" && (
                        <div className="space-y-4">
                            {summaries.map((s: any) => (
                                <div key={s.id} className="bg-gradient-to-br from-cyan-900/10 to-transparent border border-cyan-500/20 rounded-lg p-4 group relative hover:border-cyan-500/40">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase">{s.sourceType}</span>
                                        {/* Botão Jogar no Canvas */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); sendToWorkbench(s, 'summary') }}
                                            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                                            title="Enviar para o Workbench"
                                        >
                                            <ArrowRightToLine className="w-3 h-3" /> Canvas
                                        </button>
                                    </div>
                                    <div className="prose prose-invert prose-sm text-xs text-gray-300 max-h-40 overflow-y-auto">
                                        <ReactMarkdown>{s.generatedText}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MARCAÇÕES */}
                    {activeTab === "highlights" && (
                        <div className="space-y-3">
                            {visualHighlights.filter((h: any) => !h.isSummary).map((h) => (
                                <div key={h.id} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 cursor-pointer group" onClick={() => { if(highlighterRef.current) highlighterRef.current.scrollTo(h) }}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded font-mono">Pág. {h.position.pageNumber}</span>
                                        {/* Botão Jogar no Canvas */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); sendToWorkbench(h, 'highlight') }}
                                            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                                            title="Enviar para o Workbench"
                                        >
                                            <ArrowRightToLine className="w-3 h-3" /> Canvas
                                        </button>
                                        <Trash2 className="w-3 h-3 text-gray-600 hover:text-red-400 ml-2" onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(h) }} />
                                    </div>
                                    <blockquote className="text-xs text-gray-300 border-l-2 border-yellow-500/50 pl-2 italic line-clamp-3">"{h.content.text}"</blockquote>
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