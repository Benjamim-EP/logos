import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Sparkles, ExternalLink, X } from 'lucide-react'
import { useWorkbenchStore } from '@/stores/workbenchStore'
import { toast } from 'sonner'

// Definição da estrutura dos dados do Nó
type WorkbenchData = {
  label: string
  content: string
  type: 'highlight' | 'summary'
  dbId: string
  positionPdf?: {
    pageNumber: number
    boundingRect: any
    rects: any[]
  }
}

export function WorkbenchNode({ id, data, selected }: NodeProps<any>) {
  const { type, content, label, positionPdf } = data as WorkbenchData
  
  // Hook para remover o nó do canvas
  const removeNode = useWorkbenchStore(state => state.removeNode)
  
  const isSummary = type === 'summary'

  // Ação: Pular para o PDF
  const handleJumpToPdf = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (positionPdf) {
          window.dispatchEvent(new CustomEvent('workbench-scroll-pdf', { detail: positionPdf }))
      } else {
          toast.warning("Posição original não encontrada.")
      }
  }

  // Ação: Remover do Canvas
  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      removeNode(id); // Remove visualmente da store do Workbench
  }

  return (
    <div 
      className={`
        shadow-2xl rounded-xl border-2 transition-all w-72 bg-zinc-950/90 backdrop-blur-md overflow-hidden group/node
        ${selected ? 'border-white ring-4 ring-blue-500/20' : 'border-white/10 hover:border-white/30'}
        ${isSummary ? 'border-t-4 border-t-cyan-500' : 'border-t-4 border-t-yellow-500'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-8 !h-1.5 !rounded-full !-top-[2px] transition-colors hover:!bg-white" />
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-8 !h-1.5 !rounded-full !-bottom-[2px] transition-colors hover:!bg-white" />

      {/* Cabeçalho */}
      <div 
        onClick={handleJumpToPdf}
        className={`
            p-3 border-b border-white/5 flex items-center justify-between cursor-pointer 
            transition-colors relative
            ${isSummary ? 'bg-cyan-950/30 hover:bg-cyan-900/40' : 'bg-yellow-950/20 hover:bg-yellow-900/30'}
        `}
        title="Clique para localizar no PDF"
      >
        <div className="flex items-center gap-2">
            {isSummary ? <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> : <FileText className="w-3.5 h-3.5 text-yellow-500" />}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSummary ? 'text-cyan-200' : 'text-yellow-200'}`}>
            {isSummary ? 'Resumo IA' : 'Trecho'}
            </span>
        </div>
        
        <div className="flex items-center gap-2">
             {/* Ícone Link (Só aparece no hover) */}
             {positionPdf && (
                <ExternalLink className="w-3 h-3 text-white/50 opacity-0 group-hover/node:opacity-100 transition-opacity" />
             )}
             
             {/* BOTÃO DELETAR (X) - AGORA ESTÁ AQUI! */}
             <button 
                onClick={handleDelete}
                className="text-zinc-500 hover:text-red-400 opacity-0 group-hover/node:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                title="Remover do Canvas"
             >
                <X className="w-3.5 h-3.5" />
             </button>
        </div>
      </div>

      <div className="p-4 bg-zinc-900/50">
        <p className="text-xs text-zinc-300 line-clamp-[8] font-serif leading-relaxed whitespace-pre-wrap">
          "{content}"
        </p>
      </div>

      <div className="px-4 py-2 border-t border-white/5 bg-black/20 text-[9px] text-zinc-500 font-mono flex justify-between items-center">
        <span className="truncate max-w-[150px] uppercase tracking-tight">{String(label)}</span>
        {positionPdf?.pageNumber && (
            <span className="bg-white/5 px-1.5 py-0.5 rounded">Pág. {positionPdf.pageNumber}</span>
        )}
      </div>
    </div>
  )
}