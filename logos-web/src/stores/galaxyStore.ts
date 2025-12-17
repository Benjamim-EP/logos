import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy' // <--- Add SubCluster
import { generateUniverse } from '@/features/galaxy/utils/generator'

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

interface GalaxyState {
  allNotes: Note[]
  clusters: Cluster[]
  subClusters: SubCluster[] // <--- NOVO
  
  isLoading: boolean
  focusNode: Note | null
  viewMode: ViewMode
  
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  initializeGalaxy: (count?: number) => void
  setFocusNode: (note: Note | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleCluster: (clusterId: string) => void
  setSortOrder: (order: SortOrder) => void
  
  // Atualizar retorno do selector
  getVisibleData: () => { 
    visibleNotes: Note[], 
    visibleClusters: Cluster[],
    visibleSubClusters: SubCluster[] // <--- NOVO
  }
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  allNotes: [],
  clusters: [],
  subClusters: [], // <--- Inicializa vazio
  isLoading: false,
  focusNode: null,
  viewMode: 'galaxy',
  
  activeClusterIds: [],
  sortOrder: 'newest',
  maxVisibleNotes: 400,

  initializeGalaxy: (count = 1500) => {
    set({ isLoading: true })
    setTimeout(() => {
      // O gerador agora retorna subClusters também
      const { clusters, subClusters, notes } = generateUniverse(count)
      set({ 
        clusters, 
        subClusters, // <--- Salva no estado
        allNotes: notes, 
        activeClusterIds: clusters.map(c => c.id),
        isLoading: false 
      })
    }, 800)
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
    
    // 1. Filtrar Galáxias
    const visibleClusters = state.clusters.filter(c => state.activeClusterIds.includes(c.id))
    
    // 2. Filtrar Sistemas Solares (Se a galáxia pai está visível, eles também estão)
    const visibleSubClusters = state.subClusters.filter(sc => state.activeClusterIds.includes(sc.clusterId))
    
    // 3. Filtrar Notas
    let filteredNotes = state.allNotes.filter(n => state.activeClusterIds.includes(n.clusterId))

    // Ordenação
    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    // Limite de Performance (Max 400)
    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { visibleNotes, visibleClusters, visibleSubClusters }
  }
}))