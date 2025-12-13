import { create } from 'zustand'
import type { Cluster, Note } from '@/types/galaxy'
import { generateUniverse } from '@/features/galaxy/utils/generator'

interface GalaxyState {
  notes: Note[]
  clusters: Cluster[]
  isLoading: boolean
  focusNode: Note | null // <--- NOVO ESTADO: Nó focado (Double Click)
  
  initializeGalaxy: (count?: number) => void
  setFocusNode: (note: Note | null) => void // <--- NOVA ACTION
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  notes: [],
  clusters: [],
  isLoading: false,
  focusNode: null,

  initializeGalaxy: (count = 800) => {
    set({ isLoading: true })
    setTimeout(() => {
      const { clusters, notes } = generateUniverse(count)
      set({ clusters, notes, isLoading: false })
    }, 800)
  },

  setFocusNode: (note) => set({ focusNode: note })
}))