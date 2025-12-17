import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import { generateUniverse } from '@/features/galaxy/utils/generator'

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

  initializeGalaxy: (count?: number) => void
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

  initializeGalaxy: (count = 1500) => {
    // Verifica se já tem dados para não recalcular à toa
    if (get().allNotes.length > 0) return;

    set({ isLoading: true })
    
    // REDUZIMOS O DELAY: De 800ms para 10ms (Quase instantâneo, mas async para não travar a UI)
    setTimeout(() => {
      const { clusters, subClusters, notes } = generateUniverse(count)
      
      set({ 
        clusters, 
        subClusters,
        allNotes: notes, 
        // TRUQUE: Já inicializa com todos os clusters ativos
        activeClusterIds: clusters.map(c => c.id),
        isLoading: false 
      })
    }, 10)
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
    
    // FALLBACK DE SEGURANÇA:
    // Se a lista de ativos estiver vazia (bug de estado), considera TODOS os clusters.
    // Isso evita a tela preta.
    const effectiveClusterIds = (state.activeClusterIds && state.activeClusterIds.length > 0)
      ? state.activeClusterIds 
      : state.clusters.map(c => c.id)
    
    const visibleClusters = state.clusters.filter(c => effectiveClusterIds.includes(c.id))
    
    // Filtra SubClusters (segurança extra: verifica se subClusters existe)
    const subList = state.subClusters || []
    const visibleSubClusters = subList.filter(sc => effectiveClusterIds.includes(sc.clusterId))
    
    let filteredNotes = state.allNotes.filter(n => effectiveClusterIds.includes(n.clusterId))

    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { visibleNotes, visibleClusters, visibleSubClusters }
  }
}))