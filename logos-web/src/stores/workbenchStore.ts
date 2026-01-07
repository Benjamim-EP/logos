import { create } from 'zustand'
import { 
  type Node, 
  type Edge, 
  type OnNodesChange, 
  type OnEdgesChange, 
  type Connection, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges 
} from '@xyflow/react'
import api from '@/lib/api'

// Tipos de dados customizados para nossos nós
export type WorkbenchNodeData = {
  label: string
  content: string
  type: 'highlight' | 'summary'
  dbId: string
  [key: string]: unknown // Necessário para compatibilidade com Record<string, unknown> do React Flow
}

interface WorkbenchState {
  nodes: Node<WorkbenchNodeData>[]
  edges: Edge[]
  
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  
  addNode: (node: Node<WorkbenchNodeData>) => void
  loadState: (fileHash: string) => Promise<void>
  saveState: (fileHash: string) => Promise<void>
  removeNode: (nodeId: string) => void
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ 
      // CORREÇÃO: Cast explícito para garantir o tipo
      nodes: applyNodeChanges(changes, get().nodes) as Node<WorkbenchNodeData>[] 
    })
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) })
  },

  addNode: (node) => {
    const exists = get().nodes.find(n => n.id === node.id)
    if (!exists) {
        set({ nodes: [...get().nodes, node] })
    }
  },
  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      // Também removemos as linhas (edges) conectadas a este nó
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    })
  },

  loadState: async (fileHash) => {
    try {
        const { data } = await api.get(`/library/workbench/${fileHash}`)
        // Se vier vazio, não quebra
        if (data && data.nodes) {
            set({ 
                nodes: JSON.parse(data.nodes), 
                edges: JSON.parse(data.edges) 
            })
        } else {
            set({ nodes: [], edges: [] }) // Reset se for novo
        }
    } catch (e) {
        console.error("Erro ao carregar workbench", e)
        set({ nodes: [], edges: [] })
    }
  },

  saveState: async (fileHash) => {
    const { nodes, edges } = get()
    try {
        await api.post(`/library/workbench/${fileHash}`, {
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges)
        })
    } catch (e) {
        console.error("Erro ao salvar workbench", e)
    }
  }
}))