// #logos-web/src/stores/galaxyStore.ts
import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner" // Importante para feedback visual

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

interface GalaxyState {
  allNotes: Note[]
  clusters: Cluster[]
  subClusters: SubCluster[]
  
  isLoading: boolean
  isGravityLoading: boolean // Novo estado para loading específico da gravidade
  focusNode: Note | null
  viewMode: ViewMode
  
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  // Actions
  initializeGalaxy: (count?: number) => Promise<void>
  applyGravity: (term: string) => Promise<void> // <--- A Mágica
  setFocusNode: (note: Note | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleCluster: (clusterId: string) => void
  setSortOrder: (order: SortOrder) => void
  
  getVisibleData: () => { 
    visibleNotes: Note[], 
    visibleClusters: Cluster[],
    visibleSubClusters: SubCluster[] 
  }
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  allNotes: [],
  clusters: [],
  subClusters: [],
  isLoading: false,
  isGravityLoading: false,
  focusNode: null,
  viewMode: 'galaxy',
  
  activeClusterIds: [],
  sortOrder: 'newest',
  maxVisibleNotes: 400,

  /**
   * FASE 2: Inicialização com Dados Reais (Modo Caos)
   */
  initializeGalaxy: async () => {
    if (get().allNotes.length > 0 || get().isLoading) return;

    set({ isLoading: true })
    
    try {
        console.log("🌌 Conectando ao Núcleo da Biblioteca...")
        const { data: stars } = await api.get('/galaxy/stars')
        
        console.log(`📡 Telemetria recebida: ${stars.length} objetos estelares.`)

        if (!stars || stars.length === 0) {
            set({ isLoading: false, allNotes: [] })
            return
        }

        const notes: Note[] = stars.map((star: any) => {
             // Distribuição Esférica Inicial (Caos)
             const theta = Math.random() * 2 * Math.PI;
             const phi = Math.acos(2 * Math.random() - 1);
             const radius = 1000 + Math.random() * 2000;

             return {
                id: star.id,
                title: star.documentTitle || "Documento Sem Nome",
                preview: star.content || "Sem conteúdo...",
                tags: [star.type === 'IMAGE' ? 'Visual' : 'Texto'],
                createdAt: star.createdAt,
                
                // Posição Inicial
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.sin(phi) * Math.sin(theta),
                z: Math.random() * 2 + 0.5,
                
                clusterId: "chaos",
                documentId: star.documentId
             }
        })

        set({ 
            allNotes: notes, 
            clusters: [],
            subClusters: [],
            activeClusterIds: ["chaos"],
            isLoading: false 
        })

    } catch (error) {
        console.error("❌ Falha crítica nos sensores:", error)
        set({ isLoading: false })
    }
  },

  /**
   * FASE 3: Motor de Gravidade Semântica
   * O usuário cria um "Centro de Gravidade" (ex: "Java") e a IA puxa as notas relacionadas.
   */
  applyGravity: async (term: string) => {
    if (!term.trim()) return

    set({ isGravityLoading: true })

    try {
        // 1. Consulta o Oráculo (AI Processor)
        console.log(`🧲 Gerando poço gravitacional para: "${term}"`)
        const { data } = await api.post('/ai/galaxy/gravity', term, {
            headers: { 'Content-Type': 'text/plain' }
        })
        
        // Array de { highlightId, score }
        const matches = data.matches as { highlightId: string, score: number }[]
        
        if (matches.length === 0) {
            toast.info(`Nenhuma conexão encontrada para "${term}".`, {
                description: "Tente um termo mais genérico ou verifique seus documentos."
            })
            set({ isGravityLoading: false })
            return
        }

        toast.success(`Gravidade aplicada: "${term}"`, {
            description: `${matches.length} notas foram atraídas.`
        })

        // 2. Define o novo Centro de Gravidade no Espaço
        // Escolhemos uma posição aleatória longe do centro (0,0) para criar aglomerados distintos
        const centerOffset = { 
            x: (Math.random() - 0.5) * 3000, 
            y: (Math.random() - 0.5) * 3000 
        } 

        // 3. Cria um novo Cluster visual (Galáxia Nomeada)
        const newCluster: Cluster = {
            id: `cluster-${term}-${Date.now()}`,
            label: term,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), // Cor aleatória
            x: centerOffset.x,
            y: centerOffset.y
        }

        // 4. Aplica a Física nas Estrelas
        set(state => {
            const newNotes = state.allNotes.map(note => {
                const match = matches.find(m => m.highlightId === note.id)
                
                if (match) {
                    // FÍSICA DE ATRAÇÃO
                    // Score 1.0 (Muito igual) -> Distância 0 (Colado no centro)
                    // Score 0.6 (Pouco igual) -> Distância 800 (Orbita longe)
                    const attractionStrength = Math.pow(match.score, 3) // Exponencial para separar bem o joio do trigo
                    const distance = (1 - attractionStrength) * 1200 
                    
                    // Adiciona dispersão angular para formar uma nuvem (Cluster), não uma linha
                    const angle = Math.random() * 2 * Math.PI
                    const dispersion = Math.random() * 200 // Jitter aleatório
                    
                    return {
                        ...note,
                        // Move a estrela para a nova galáxia
                        x: centerOffset.x + (Math.cos(angle) * (distance + dispersion)),
                        y: centerOffset.y + (Math.sin(angle) * (distance + dispersion)),
                        // Adiciona o termo às tags para referência futura
                        tags: [...new Set([...note.tags, term])],
                        clusterId: newCluster.id // Associa ao novo cluster
                    }
                }
                // Se não deu match, a nota fica onde estava (ou no Caos)
                return note 
            })
            
            return { 
                allNotes: newNotes,
                clusters: [...state.clusters, newCluster], // Adiciona o label visual no mapa
                activeClusterIds: [...state.activeClusterIds, newCluster.id],
                isGravityLoading: false
            }
        })

    } catch (e) {
        console.error("Erro ao aplicar gravidade", e)
        toast.error("Falha no Motor de Gravidade", { description: "O AI Processor não respondeu." })
        set({ isGravityLoading: false })
    }
  },

  setFocusNode: (note) => set({ focusNode: note }),
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleCluster: (clusterId) => set((state) => {
    const isActive = state.activeClusterIds.includes(clusterId)
    const newIds = isActive 
      ? state.activeClusterIds.filter(id => id !== clusterId)
      : [...state.activeClusterIds, clusterId]
    return { activeClusterIds: newIds }
  }),

  setSortOrder: (order) => set({ sortOrder: order }),

  getVisibleData: () => {
    const state = get()
    
    // Mostra tudo por padrão se não tiver filtro explícito
    // Na fase 3, você pode querer filtrar: "Só mostrar estrelas do cluster Java"
    // Por enquanto, mostra tudo para ver o movimento acontecer.
    let filteredNotes = state.allNotes

    // Se tiver clusters ativos específicos (exclui chaos), filtra
    // (Lógica opcional para o futuro)
    
    // Ordenação Z-Index (Render Order)
    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { 
        visibleNotes, 
        visibleClusters: state.clusters, 
        visibleSubClusters: state.subClusters 
    }
  }
}))