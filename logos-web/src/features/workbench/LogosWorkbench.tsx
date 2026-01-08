import { useEffect, useMemo, useState } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWorkbenchStore } from '@/stores/workbenchStore'
import { WorkbenchNode } from './WorkbenchNode'
import { Button } from '@/components/ui/button'
import { Save, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SuggestionsModal } from './SuggestionsModal'

interface LogosWorkbenchProps {
  fileHash: string
}

export function LogosWorkbench({ fileHash }: LogosWorkbenchProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, loadState, saveState } = useWorkbenchStore()
  
  // Estado para feedback visual do Auto-Save
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  const nodeTypes = useMemo<NodeTypes>(() => ({
    custom: WorkbenchNode as any, 
  }), [])

  // 1. Carregar ao abrir
  useEffect(() => {
    loadState(fileHash)
  }, [fileHash])

  // 2. Lógica de AUTO-SAVE (Debounce)
  useEffect(() => {
    // Se não houver nós, não tenta salvar (evita salvar vazio no load inicial)
    if (nodes.length === 0) return;

    setSaveStatus('unsaved')
    
    // Espera 2 segundos após a última mudança
    const timer = setTimeout(async () => {
        setSaveStatus('saving')
        try {
            await saveState(fileHash)
            setSaveStatus('saved')
        } catch (error) {
            setSaveStatus('unsaved')
        }
    }, 2000)

    return () => clearTimeout(timer)
  }, [nodes, edges, fileHash]) // Roda sempre que nodes ou edges mudarem

  // Salvamento Manual (Forçado)
  const handleManualSave = async () => {
    setSaveStatus('saving')
    await saveState(fileHash)
    setSaveStatus('saved')
    toast.success("Layout salvo com sucesso.")
  }

  return (
    <div className="w-full h-full bg-[#080808] relative border-l border-white/10">
      
      {/* Toolbar Superior */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        
        {/* Indicador de Status */}
        <div className="text-xs font-mono text-zinc-500 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
            {saveStatus === 'saved' && (
                <>
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Salvo</span>
                </>
            )}
            {saveStatus === 'saving' && (
                <>
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                    <span>Salvando...</span>
                </>
            )}
            {saveStatus === 'unsaved' && (
                <>
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>Alterado</span>
                </>
            )}
        </div>

        <Button 
            size="sm" 
            onClick={handleManualSave} 
            className="bg-zinc-800/80 hover:bg-zinc-700 text-white text-xs border border-white/10 backdrop-blur-md"
        >
            <Save className="w-3 h-3 mr-2" /> Salvar
        </Button>
      </div>

      <ReactFlow
        nodes={nodes as any}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#080808]"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={24} size={1} />
        
        <Controls className="!bg-zinc-900/80 !border-white/10 !fill-white [&>button]:!border-b-white/10 hover:[&>button]:!bg-zinc-800" />
        
        <MiniMap 
            position="bottom-right"
            className="!bg-zinc-950/40 !border !border-white/10 !rounded-lg !mb-4 !mr-4 backdrop-blur-sm shadow-xl"
            style={{ width: 150, height: 100 }}
            maskColor="rgba(0, 0, 0, 0.4)"
            nodeColor={(n: any) => {
                if (n.data?.type === 'summary') return '#06b6d4';
                return '#eab308';
            }}
            nodeStrokeWidth={3}
            zoomable
            pannable
        />
      </ReactFlow>
      <SuggestionsModal />
    </div>
  )
}