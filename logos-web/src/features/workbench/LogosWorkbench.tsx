import { useEffect, useMemo } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  type Connection,
  type Edge,
  type NodeTypes,
  addEdge, // Importante para criar conexões
  useNodesState,
  useEdgesState
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWorkbenchStore } from '@/stores/workbenchStore'
import { WorkbenchNode } from './WorkbenchNode'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

interface LogosWorkbenchProps {
  fileHash: string
}

export function LogosWorkbench({ fileHash }: LogosWorkbenchProps) {
  // Conecta com a Store Global
  const { 
      nodes, edges, 
      onNodesChange, onEdgesChange, onConnect, 
      loadState, saveState 
  } = useWorkbenchStore()

  // Define os tipos de nós (Memoizado para performance)
  const nodeTypes = useMemo<NodeTypes>(() => ({
    custom: WorkbenchNode as any, 
  }), [])

  // Carrega ao abrir
  useEffect(() => {
    loadState(fileHash)
  }, [fileHash])

  const handleSave = async () => {
    await saveState(fileHash)
    toast.success("Workbench salvo", { description: "Layout persistido com sucesso." })
  }

  return (
    <div className="w-full h-full bg-[#080808] relative border-l border-white/10">
      
      {/* Toolbar Superior */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button 
            size="sm" 
            onClick={handleSave} 
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
        // Estilo do Grid de Fundo
        className="bg-[#080808]"
      >
        {/* Grid Pontilhado Sutil */}
        <Background color="#333" gap={24} size={1} />
        
        {/* Controles de Zoom (Estilo Dark) */}
        <Controls 
            className="
                !bg-zinc-900 
                !border-white/10 
                !fill-zinc-400 
                [&>button]:!border-b-white/10 
                [&>button]:!bg-zinc-900
                hover:[&>button]:!bg-zinc-800 
                hover:[&>button]:!fill-white
            " 
        />
        
        {/* --- MINIMAPA MODERNO --- */}
        <MiniMap 
            position="bottom-right"
            // Estilização Glassmorphism
            className="!bg-zinc-950/40 !border !border-white/10 !rounded-lg !mb-4 !mr-4 backdrop-blur-sm shadow-xl"
            style={{ width: 150, height: 100 }}
            
            // Cor da 'máscara' (área não visível) - Quase transparente
            maskColor="rgba(0, 0, 0, 0.4)"
            
            // Cor dos nós dentro do minimapa
            nodeColor={(n: any) => {
                if (n.data?.type === 'summary') return '#06b6d4'; // Ciano
                return '#eab308'; // Amarelo (Highlight)
            }}
            nodeStrokeWidth={3}
            zoomable
            pannable
        />
      </ReactFlow>
    </div>
  )
}