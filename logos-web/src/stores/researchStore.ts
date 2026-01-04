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
  savePaper: (paper: ResearchPaper) => Promise<void>
  removePaper: (paperId: string) => void
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      results: [],
      isLoading: false,
      
      storageUsed: 45, 
      storageLimit: 100,
      savedPapers: [],

      search: async (query, field) => {
        set({ isLoading: true })
        try {
            const papers = await searchPapers(query, field)
            const savedIds = get().savedPapers.map(p => p.id)
            
            // Marca quais já foram salvos
            const markedPapers = papers.map((p: any) => ({
                ...p,
                isSaved: savedIds.includes(p.id)
            }))

            set({ results: markedPapers, isLoading: false })
        } catch (e) {
            console.error(e)
            set({ isLoading: false })
            toast.error("Erro ao buscar artigos.")
        }
      },

      // --- AÇÃO REAL DE SALVAR ---
      savePaper: async (paper) => {
        const { storageUsed, storageLimit } = get()
        
        if (storageUsed + paper.sizeMB > storageLimit) {
          toast.error("Limite de armazenamento excedido!")
          return
        }

        if (!paper.pdfUrl) {
            toast.error("Este artigo não possui PDF disponível para download.")
            return
        }

        // 1. Feedback Imediato
        const toastId = toast.loading("Baixando documento para a Galáxia...", { description: "Isso pode levar alguns segundos." })

        try {
            // 2. Chamada ao Backend (Ingestion API)
            await api.post("/ingestion/url", {
                pdfUrl: paper.pdfUrl,
                title: paper.title,
                source: "OpenAlex"
            })

            // 3. Sucesso
            toast.dismiss(toastId)
            toast.success("Documento salvo!", {
                description: "Ele aparecerá na Biblioteca e será processado pela IA."
            })

            // 4. Atualiza Estado Local
            set((state) => ({
                storageUsed: state.storageUsed + paper.sizeMB,
                savedPapers: [...state.savedPapers, { ...paper, isSaved: true }],
                results: state.results.map(r => r.id === paper.id ? { ...r, isSaved: true } : r)
            }))

        } catch (error: any) {
            console.error("Erro ao salvar:", error)
            toast.dismiss(toastId)
            
            // Tratamento de erro amigável
            const msg = error.response?.status === 401 
                ? "Sessão expirada. Faça login novamente." 
                : "Não foi possível baixar o PDF (Bloqueio do servidor de origem ou erro interno)."
            
            toast.error("Falha no download", { description: msg })
        }
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