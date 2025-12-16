import { create } from 'zustand'
// CORREÇÃO 1: Adicionado 'type' na importação
import type { Cluster, Note } from '@/types/galaxy'
import { generateUniverse } from '@/features/galaxy/utils/generator'

// CORREÇÃO 2: Definir o tipo explicitamente
export type ViewMode = 'galaxy' | 'shelf' | 'profile' 
export type SortOrder = 'newest' | 'oldest' | 'relevance'


interface GalaxyState {
  allNotes: Note[]
  clusters: Cluster[]
  isLoading: boolean
  focusNode: Note | null
  
  // CORREÇÃO 3: Usar o tipo Union aqui
  viewMode: ViewMode
  
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  initializeGalaxy: (count?: number) => void
  setFocusNode: (note: Note | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleCluster: (clusterId: string) => void
  setSortOrder: (order: SortOrder) => void
  
  getVisibleData: () => { visibleNotes: Note[], visibleClusters: Cluster[] }
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  allNotes: [],
  clusters: [],
  isLoading: false,
  focusNode: null,
  viewMode: 'galaxy', // O TS agora sabe que isso é do tipo ViewMode
  
  activeClusterIds: [],
  sortOrder: 'newest',
  maxVisibleNotes: 400,

  initializeGalaxy: (count = 1500) => {
    set({ isLoading: true })
    setTimeout(() => {
      const { clusters, notes } = generateUniverse(count)
      set({ 
        clusters, 
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
    
    const visibleClusters = state.clusters.filter(c => state.activeClusterIds.includes(c.id))
    
    let filteredNotes = state.allNotes.filter(n => state.activeClusterIds.includes(n.clusterId))

    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { visibleNotes, visibleClusters }
  }
}))