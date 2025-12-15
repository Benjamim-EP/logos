import { useEffect, useState } from "react"
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
import { X, MessageSquare, Loader2 } from "lucide-react"
import { usePdfStore } from "@/stores/pdfStore"
import type { Note } from "@/types/galaxy"

// --- CORREÇÃO FINAL: IMPORT DO CSS DA LIB ---
// Sem isso, a biblioteca não consegue calcular as posições!
import "react-pdf-highlighter/dist/style.css"

/* ================= PDF WORKER CONFIG ================= */
const pdfVersion = pdfjs.version || "5.4.449"
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.js`

/* ================= TIP COMPONENT ================= */
function HighlightTip({
  onOpen,
  onConfirm,
}: {
  onOpen: () => void
  onConfirm: (comment: { text: string; emoji: string }) => void
}) {
  return (
    <div className="bg-zinc-900 border border-white/20 p-2 rounded-lg shadow-xl flex gap-2 z-50">
      <Button
        size="sm"
        className="h-8 text-xs bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-0"
        onClick={() => onConfirm({ text: "Marcado", emoji: "🖍️" })}
      >
        Marcar
      </Button>

      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 text-xs border-white/20 hover:bg-white/10 text-gray-300"
        onClick={onOpen}
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        Comentar
      </Button>
    </div>
  )
}

/* ================= MAIN VIEW ================= */
interface PdfReaderViewProps {
  note: Note
  pdfUrl: string
  onClose: () => void
}

interface Content {
  text?: string
  image?: string
}

export function PdfReaderView({
  note,
  pdfUrl,
  onClose,
}: PdfReaderViewProps) {
  const { getHighlights, addHighlight } = usePdfStore()
  const [highlights, setHighlights] = useState<IHighlight[]>([])

  useEffect(() => {
    setHighlights(getHighlights(note.id))
  }, [note.id, getHighlights])

  const saveHighlight = (highlight: IHighlight) => {
    addHighlight(note.id, highlight)
    setHighlights((prev) => [...prev, highlight])
  }

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col">

      {/* HEADER */}
      <div className="h-14 border-b border-white/10 bg-black flex items-center justify-between px-4 z-50">
        <div>
          <h2 className="text-white font-bold text-sm truncate max-w-md">
            {note.title}
          </h2>
          <span className="text-[10px] text-gray-500">
            Modo leitura • PDF
          </span>
        </div>

        <Button size="icon" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-400">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* BODY */}
      <div className="flex-1 relative bg-zinc-900 overflow-hidden w-full h-full">
        
        {/* 
            Container Absoluto Essencial.
            O CSS importado na linha 16 vai trabalhar junto com este estilo inline
            para garantir que a biblioteca encontre as dimensões corretas.
        */}
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <PdfLoader
            url={pdfUrl}
            beforeLoad={
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span>Carregando documento...</span>
              </div>
            }
            errorMessage={
              <div className="flex items-center justify-center h-full text-red-400 p-4 text-center">
                Erro ao carregar PDF. Verifique se o arquivo "{pdfUrl}" existe na pasta /public.
              </div>
            }
          >
            {(pdfDocument) => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                highlights={highlights}
                enableAreaSelection={(e) => e.altKey}
                onScrollChange={() => {}}
                scrollRef={() => {}}
                
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  <HighlightTip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      saveHighlight({
                        id: crypto.randomUUID(),
                        position,
                        content,
                        comment,
                      })
                      hideTipAndSelection()
                    }}
                  />
                )}
                
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  _viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isText = !Boolean(
                    highlight.content && (highlight.content as Content).image
                  )

                  const component = isText ? (
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      isScrolledTo={isScrolledTo}
                      highlight={highlight}
                      onChange={() => {}}
                    />
                  )

                  return (
                    <Popup
                      key={index}
                      popupContent={
                        <div className="bg-white text-black text-xs p-2 rounded shadow border border-gray-200 z-[300]">
                          <strong>Nota:</strong> {highlight.comment?.text || "—"}
                        </div>
                      }
                      onMouseOver={(content) =>
                        setTip(highlight, () => content)
                      }
                      onMouseOut={hideTip}
                    >
                      {component}
                    </Popup>
                  )
                }}
              />
            )}
          </PdfLoader>
        </div>
      </div>
    </div>
  )
}