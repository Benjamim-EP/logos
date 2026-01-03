import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { searchPapers } from '@/services/openAlex'

import api from "@/lib/api"
import { toast } from "sonner"

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

      removePaper: (paperId) => {
        const paper = get().savedPapers.find(p => p.id === paperId)
        if (!paper) return

        set((state) => ({
          storageUsed: state.storageUsed - paper.sizeMB,
          savedPapers: state.savedPapers.filter(p => p.id !== paperId),
          results: state.results.map(r => r.id === paperId ? { ...r, isSaved: false } : r)
        }))
      },

      savePaper: async (paper) => {
        const { storageUsed, storageLimit } = get()
        
        // Validação simples de limite (mockada)
        if (storageUsed + paper.sizeMB > storageLimit) {
          toast.error("Limite de armazenamento excedido!")
          return
        }

        // 1. Feedback Visual Imediato
        toast.loading("Baixando documento para a Galáxia...", { id: "save-process" })

        try {
            // 2. Chamada ao Backend (NOVO)
            await api.post("/ingestion/url", {
                pdfUrl: paper.pdfUrl,
                title: paper.title,
                source: "OpenAlex"
            })

            // 3. Sucesso
            toast.dismiss("save-process")
            toast.success("Documento salvo!", {
                description: "Ele aparecerá na sua Biblioteca em instantes."
            })

            // 4. Atualiza Estado Local (UI)
            set((state) => ({
                storageUsed: state.storageUsed + paper.sizeMB,
                // Marca como salvo na lista de resultados
                results: state.results.map(r => r.id === paper.id ? { ...r, isSaved: true } : r),
                // Adiciona à lista de salvos
                savedPapers: [...state.savedPapers, { ...paper, isSaved: true }]
            }))

        } catch (error: any) {
            console.error("Erro ao salvar paper:", error)
            toast.dismiss("save-process")
            
            const msg = error.response?.status === 401 
                ? "Sessão expirada. Faça login novamente." 
                : "Falha ao baixar o PDF. A URL pode estar protegida."
            
            toast.error("Erro ao salvar", { description: msg })
        }
      },
    }),
    { name: 'logos-research-storage' }
  )
)