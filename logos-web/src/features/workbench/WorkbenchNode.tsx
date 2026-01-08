import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Sparkles, ExternalLink, X, BrainCircuit } from 'lucide-react'
import { useWorkbenchStore, type WorkbenchNodeData } from '@/stores/workbenchStore'
import { toast } from 'sonner'

// Definição da estrutura dos dados do Nó
type WorkbenchData = {
  label: string
  content: string
  type: 'highlight' | 'summary'
  dbId: string
  fileHash: string
  positionPdf?: {
    pageNumber: number
    boundingRect: any
    rects: any[]
  }
}

export function WorkbenchNode({ id, data, selected }: NodeProps<any>) {
  // Cast dos dados
  const { type, content, label, positionPdf, fileHash } = data as WorkbenchData
  
  const removeNode = useWorkbenchStore(state => state.removeNode)
  const findSuggestions = useWorkbenchStore(state => state.findSuggestions) // <--- Hook novo
  
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

  // Ação: Remover
  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      removeNode(id);
  }

  // Ação: IA Sugerir Links
  const handleAiSuggest = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // Agora fileHash não será undefined
      if (content && fileHash) {
          findSuggestions(id, content, fileHash)
      } else {
          // Esse toast só aparece se os dados estiverem corrompidos
          toast.error("Dados insuficientes para análise contextual.")
      }
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
      >
        <div className="flex items-center gap-2 overflow-hidden">
            {isSummary ? <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
            <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${isSummary ? 'text-cyan-200' : 'text-yellow-200'}`}>
               {isSummary ? 'Resumo IA' : 'Trecho'}
            </span>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
             
             {/* --- BOTÃO CÉREBRO (IA) --- */}
             <button 
                onClick={handleAiSuggest}
                className="text-zinc-500 hover:text-cyan-400 opacity-0 group-hover/node:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                title="Sugerir conexões com IA"
             >
                <BrainCircuit className="w-3.5 h-3.5" />
             </button>

             {/* Link */}
             {positionPdf && (
                <ExternalLink className="w-3 h-3 text-white/50 opacity-0 group-hover/node:opacity-100 transition-opacity" />
             )}
             
             {/* Delete */}
             <button 
                onClick={handleDelete}
                className="text-zinc-500 hover:text-red-400 opacity-0 group-hover/node:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
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