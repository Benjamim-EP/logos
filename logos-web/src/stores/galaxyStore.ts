import { create } from 'zustand'
import type { Cluster, Note } from '@/types/galaxy'
import { generateUniverse } from '@/features/galaxy/utils/generator'

interface GalaxyState {
  notes: Note[]
  clusters: Cluster[]
  isLoading: boolean
  
  // Actions
  initializeGalaxy: (count?: number) => void
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  notes: [],
  clusters: [],
  isLoading: false,

  initializeGalaxy: (count = 1500) => {
    set({ isLoading: true })
    
    // Pequeno delay para simular cálculo/fetch
    setTimeout(() => {
      const { clusters, notes } = generateUniverse(count)
      console.log(`🌌 Universo gerado com ${notes.length} notas em ${clusters.length} clusters.`)
      
      set({ 
        clusters, 
        notes, 
        isLoading: false 
      })
    }, 800)
  }
}))