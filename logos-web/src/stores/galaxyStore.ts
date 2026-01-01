
import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api" // Seu cliente Axios configurado

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

interface GalaxyState {
  allNotes: Note[]
  clusters: Cluster[]
  subClusters: SubCluster[]
  
  isLoading: boolean
  focusNode: Note | null
  viewMode: ViewMode
  
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  // Actions
  initializeGalaxy: (count?: number) => Promise<void>
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
  focusNode: null,
  viewMode: 'galaxy',
  
  activeClusterIds: [],
  sortOrder: 'newest',
  maxVisibleNotes: 400,

  /**
   * INICIALIZAÇÃO REAL (Fase 2)
   * Busca dados do backend e distribui no espaço 3D aleatoriamente.
   */
  initializeGalaxy: async () => {
    // Evita recarregar se já tem dados ou está carregando
    if (get().allNotes.length > 0 || get().isLoading) return;

    set({ isLoading: true })
    
    try {
        console.log("🌌 Iniciando conexão com Library Service...")
        
        // 1. Chamada ao Backend (Library Service -> GalaxyController)
        const { data: stars } = await api.get('/galaxy/stars')
        
        console.log(`📡 Dados recebidos: ${stars.length} estrelas.`)

        if (!stars || stars.length === 0) {
            set({ isLoading: false, allNotes: [] })
            return
        }

        // 2. Mapeamento e Distribuição Espacial (Big Bang)
        // Como ainda não temos o X,Y da IA, distribuímos em uma esfera para ficar bonito.
        const notes: Note[] = stars.map((star: any) => {
             // Matemática esférica para distribuir pontos uniformemente no espaço
             // Isso evita que fiquem todos amontoados no centro
             const theta = Math.random() * 2 * Math.PI; // Ângulo horizontal
             const phi = Math.acos(2 * Math.random() - 1); // Ângulo vertical
             const radius = 800 + Math.random() * 2500; // Distância do centro (Variada)

             return {
                id: star.id,
                title: star.documentTitle || "Documento Sem Nome",
                preview: star.content || "Sem conteúdo...",
                
                // Tags iniciais baseadas no tipo
                tags: [star.type === 'IMAGE' ? 'Visual' : 'Texto'],
                
                createdAt: star.createdAt,
                
                // Coordenadas calculadas (Placeholder para a Fase 3)
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.sin(phi) * Math.sin(theta),
                z: Math.random() * 2 + 0.5, // Tamanho varia um pouco
                
                clusterId: "chaos", // Cluster padrão inicial
                documentId: star.documentId
             }
        })

        set({ 
            allNotes: notes, 
            clusters: [], // Sem clusters definidos ainda
            subClusters: [],
            activeClusterIds: ["chaos"], // Ativa o cluster padrão
            isLoading: false 
        })

    } catch (error) {
        console.error("❌ Erro crítico ao carregar galáxia:", error)
        // Fallback: não trava a UI, apenas para o loading
        set({ isLoading: false })
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
    
    // Se não tem filtro ativo ou deu bug, mostra tudo (Failsafe)
    const effectiveClusterIds = (state.activeClusterIds && state.activeClusterIds.length > 0)
      ? state.activeClusterIds 
      : ["chaos"] // Fallback para o ID que usamos no initialize
    
    // Filtra notas (na Fase 2, todas são "chaos", então mostra tudo)
    // Na Fase 3, isso filtrará por clusters semânticos
    let filteredNotes = state.allNotes // .filter(n => effectiveClusterIds.includes(n.clusterId))

    // Ordenação
    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    // Paginação virtual (LOD) para performance
    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { 
        visibleNotes, 
        visibleClusters: state.clusters, 
        visibleSubClusters: state.subClusters 
    }
  }
}))