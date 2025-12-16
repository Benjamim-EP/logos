import { create } from 'zustand'
import type { Cluster, Note } from '@/types/galaxy'
import { generateUniverse } from '@/features/galaxy/utils/generator'

// Adicionamos o tipo de visualização
type ViewMode = 'galaxy' | 'shelf'

interface GalaxyState {
  notes: Note[]
  clusters: Cluster[]
  isLoading: boolean
  focusNode: Note | null
  
  // Novo Estado
  viewMode: ViewMode  
  
  initializeGalaxy: (count?: number) => void
  setFocusNode: (note: Note | null) => void
  setViewMode: (mode: ViewMode) => void // Nova Action
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  notes: [],
  clusters: [],
  isLoading: false,
  focusNode: null,
  viewMode: 'galaxy', // Padrão começa na galáxia

  initializeGalaxy: (count = 800) => {
    set({ isLoading: true })
    setTimeout(() => {
      const { clusters, notes } = generateUniverse(count)
      set({ clusters, notes, isLoading: false })
    }, 800)
  },

  setFocusNode: (note) => set({ focusNode: note }),
  
  // Implementação da troca de tela
  setViewMode: (mode) => set({ viewMode: mode })
}))