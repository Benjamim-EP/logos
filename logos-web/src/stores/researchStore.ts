import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { searchPapers } from '@/services/openAlex'

export interface ResearchPaper {
  id: string
  title: string
  year: number
  citations: number
  venue: string
  abstract: string
  pdfUrl?: string
  sizeMB: number
  isSaved?: boolean
}

interface ResearchState {
  results: ResearchPaper[]
  isLoading: boolean
  
  // Controle de Storage (SaaS Mock)
  storageUsed: number
  storageLimit: number
  savedPapers: ResearchPaper[]

  search: (query: string, field: string) => Promise<void>
  savePaper: (paper: ResearchPaper) => void
  removePaper: (paperId: string) => void
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      results: [],
      isLoading: false,
      
      // Começa com 45MB usados de 100MB (Simulação)
      storageUsed: 45, 
      storageLimit: 100,
      savedPapers: [],

      search: async (query, field) => {
        set({ isLoading: true })
        
        // Buscamos os dados brutos
        const papers = await searchPapers(query, field)
        
        // Verifica se algum já foi salvo antes para marcar na UI
        const savedIds = get().savedPapers.map(p => p.id)
        
        // CORREÇÃO AQUI: Tipamos 'p' como 'any' para evitar o erro do TypeScript
        // O TS não sabia o que 'papers' continha exatamente.
        const markedPapers = papers.map((p: any) => ({
            ...p,
            isSaved: savedIds.includes(p.id)
        }))

        set({ results: markedPapers, isLoading: false })
      },

      savePaper: (paper) => {
        const { storageUsed, storageLimit, savedPapers } = get()
        
        if (storageUsed + paper.sizeMB > storageLimit) {
          alert("🚫 Limite de armazenamento excedido! Faça upgrade para salvar mais.")
          return
        }

        set({
          storageUsed: storageUsed + paper.sizeMB,
          savedPapers: [...savedPapers, { ...paper, isSaved: true }],
          // Atualiza a lista de resultados para refletir o status
          results: get().results.map(r => r.id === paper.id ? { ...r, isSaved: true } : r)
        })
      },

      removePaper: (paperId) => {
        const paper = get().savedPapers.find(p => p.id === paperId)
        if (!paper) return

        set((state) => ({
          storageUsed: state.storageUsed - paper.sizeMB,
          savedPapers: state.savedPapers.filter(p => p.id !== paperId),
          results: state.results.map(r => r.id === paperId ? { ...r, isSaved: false } : r)
        }))
      }
    }),
    { name: 'logos-research-storage' }
  )
)