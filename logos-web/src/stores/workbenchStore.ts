import { create } from 'zustand'
import { 
  type Node, 
  type Edge, 
  type OnNodesChange, 
  type OnEdgesChange, 
  type Connection, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  MarkerType
} from '@xyflow/react'
import api from '@/lib/api'
import { toast } from 'sonner'

// Estrutura de dados personalizada para nossos cards
export type WorkbenchNodeData = {
  label: string
  content: string
  type: 'highlight' | 'summary'
  dbId: string
  fileHash: string // Contexto do arquivo
  positionPdf?: {
    pageNumber: number
    boundingRect: any
    rects: any[]
  }
  [key: string]: unknown
}

// Estrutura da sugestão vinda da IA
export interface AiSuggestion {
  highlightId: string // ID unificado (ex: "123" ou "summary-456")
  score: number
  text: string
  originNodeId: string // O ID do nó que disparou a busca (pai)
}

interface WorkbenchState {
  // Estado do Canvas
  nodes: Node<WorkbenchNodeData>[]
  edges: Edge[]
  
  // Estado de Sugestões (Modo Descoberta)
  suggestions: AiSuggestion[]
  isSuggestionsOpen: boolean
  
  // Handlers do React Flow
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  
  // Ações CRUD
  addNode: (node: Node<WorkbenchNodeData>) => void
  removeNode: (nodeId: string) => void
  
  // Persistência
  loadState: (fileHash: string) => Promise<void>
  saveState: (fileHash: string) => Promise<void>
  
  // Ações de Inteligência
  findSuggestions: (nodeId: string, text: string, fileHash: string) => Promise<void>
  addSuggestionToCanvas: (suggestion: AiSuggestion, originNodeId: string) => void
  closeSuggestions: () => void
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  nodes: [],
  edges: [],
  suggestions: [],
  isSuggestionsOpen: false,

  // --- REACT FLOW BOILERPLATE ---
  onNodesChange: (changes) => {
    set({ 
      nodes: applyNodeChanges(changes, get().nodes) as Node<WorkbenchNodeData>[] 
    })
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) })
  },

  // --- CRUD BÁSICO ---
  addNode: (node) => {
    // Evita duplicatas baseadas no ID visual
    const exists = get().nodes.find(n => n.id === node.id)
    if (!exists) {
        set({ nodes: [...get().nodes, node] })
    }
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    })
  },

  // --- PERSISTÊNCIA ---
  loadState: async (fileHash) => {
    try {
        const { data } = await api.get(`/library/workbench/${fileHash}`)
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
        // Não reseta em erro de rede para não perder trabalho local se houver cache
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
        throw e // Repassa o erro para o componente mostrar Toast de erro
    }
  },

  // --- INTELIGÊNCIA ARTIFICIAL ---
  findSuggestions: async (nodeId, text, fileHash) => {
      try {
          toast.loading("A IA está analisando conexões...", { id: "ai-scan" })
          
          // Chama o backend que busca no Pinecone com filtro de arquivo
          const { data: matches } = await api.post('/library/workbench/suggest', {
              text,
              fileHash,
              topK: 5 // Traz até 5 sugestões
          })
          console.log("🔍 Dados que chegaram no navegador:", matches);
          const offCanvasMatches: AiSuggestion[] = matches.map((match: any) => ({
              highlightId: match.highlightId,
              score: match.score,
              text: match.text, 
              originNodeId: nodeId
          }));

          const { nodes, edges } = get()
          let newEdges = [...edges]
          
          let onCanvasMatches = 0

          matches.forEach((match: any) => {
              const originNodeData = nodes.find(n => n.id === nodeId)?.data
              if (originNodeData?.dbId === match.highlightId) return;

              const targetNode = nodes.find(n => n.data.dbId === match.highlightId)

              // REMOVA A VALIDAÇÃO match.text.length > 5, vamos confiar no que o Java manda
              const safeText = match.text || "Sem conteúdo de texto";

              if (targetNode) {
                  // --- CENÁRIO A: JÁ EXISTE NO CANVAS ---
                  // Verifica se a aresta já existe para não duplicar
                  const edgeExists = edges.some(
                      e => (e.source === nodeId && e.target === targetNode.id) || 
                           (e.source === targetNode.id && e.target === nodeId)
                  )

                  if (!edgeExists) {
                      onCanvasMatches++
                      // Cria "Ghost Edge" automática
                      newEdges.push({
                          id: `ai-${nodeId}-${targetNode.id}`,
                          source: nodeId,
                          target: targetNode.id,
                          animated: true,
                          label: `${(match.score * 100).toFixed(0)}%`,
                          style: { stroke: '#06b6d4', strokeDasharray: '5,5', strokeWidth: 2 },
                          labelStyle: { fill: '#06b6d4', fontWeight: 700, fontSize: 10 },
                          markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' }
                      })
                  }
              } else {
                offCanvasMatches.push({
                    highlightId: match.highlightId,
                    score: match.score,
                    text: safeText, // Vai receber o texto vindo direto do Postgres agora
                    originNodeId: nodeId
                })
              }
          })

          // Atualiza as arestas automáticas
          set({ edges: newEdges })

          // Feedback ao usuário e Abertura do Modal
          if (offCanvasMatches.length > 0) {
              set({ 
                  suggestions: offCanvasMatches,
                  isSuggestionsOpen: true 
              })
              toast.dismiss("ai-scan")
              toast.success("Novas conexões encontradas!", { description: "Abra o painel para adicionar." })
          } 
          else if (onCanvasMatches > 0) {
              toast.success(`${onCanvasMatches} conexões visuais criadas!`, { id: "ai-scan" })
          } 
          else {
              toast.info("Nenhuma nova conexão relevante encontrada.", { id: "ai-scan" })
          }

      } catch (e) {
          console.error(e)
          toast.error("Erro na análise da IA", { id: "ai-scan" })
      }
  },

  addSuggestionToCanvas: (suggestion, originNodeId) => {
      const { nodes, edges } = get()
      const originNode = nodes.find(n => n.id === originNodeId)
      
      // Fallback de posição se o pai não existir (raro)
      const originX = originNode?.position.x || 0
      const originY = originNode?.position.y || 0
      const fileHash = originNode?.data.fileHash || "" // Herda o contexto do pai

      // Cria o novo Nó
      const newNodeId = `ai-${suggestion.highlightId}-${Date.now()}`
      const isSummary = suggestion.highlightId.startsWith('summary')
      
      const newNode: Node<WorkbenchNodeData> = {
          id: newNodeId,
          type: 'custom',
          // Posiciona em órbita ao redor do pai
          position: { 
              x: originX + 350 + (Math.random() * 50), 
              y: originY + (Math.random() - 0.5) * 200 
          },
          data: {
              label: isSummary ? "Sugestão Resumo" : "Sugestão Trecho",
              content: suggestion.text,
              type: isSummary ? 'summary' : 'highlight',
              dbId: suggestion.highlightId,
              fileHash: fileHash as string,
              // Nota: positionPdf vem vazio pois o endpoint de sugestão não retorna isso ainda.
              // O deep link não funcionará até recarregar, mas a visualização sim.
          }
      }

      // Cria a linha conectando ao pai
      const newEdge: Edge = {
          id: `link-${originNodeId}-${newNodeId}`,
          source: originNodeId,
          target: newNodeId,
          animated: true,
          label: `${(suggestion.score * 100).toFixed(0)}%`,
          style: { stroke: '#06b6d4', strokeDasharray: '5,5', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' }
      }

      set({ 
          nodes: [...nodes, newNode],
          edges: [...edges, newEdge],
          // Remove da lista de pendentes
          suggestions: get().suggestions.filter(s => s.highlightId !== suggestion.highlightId)
      })
      
      // Fecha modal se acabar
      if (get().suggestions.length <= 1) {
          set({ isSuggestionsOpen: false })
      }
  },

  closeSuggestions: () => set({ isSuggestionsOpen: false, suggestions: [] })
}))