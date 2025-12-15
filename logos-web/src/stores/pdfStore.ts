import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IHighlight } from 'react-pdf-highlighter'

interface PdfState {
  // Mapa de ID da Nota -> Lista de Highlights
  highlights: Record<string, IHighlight[]>
  
  addHighlight: (noteId: string, highlight: IHighlight) => void
  removeHighlight: (noteId: string, highlightId: string) => void
  getHighlights: (noteId: string) => IHighlight[]
}

export const usePdfStore = create<PdfState>()(
  persist(
    (set, get) => ({
      highlights: {},

      addHighlight: (noteId, highlight) => 
        set((state) => ({
          highlights: {
            ...state.highlights,
            [noteId]: [...(state.highlights[noteId] || []), highlight]
          }
        })),

      removeHighlight: (noteId, highlightId) =>
        set((state) => ({
          highlights: {
            ...state.highlights,
            [noteId]: (state.highlights[noteId] || []).filter(h => h.id !== highlightId)
          }
        })),

      getHighlights: (noteId) => get().highlights[noteId] || []
    }),
    {
      name: 'logos-pdf-highlights', // Nome no LocalStorage
    }
  )
)