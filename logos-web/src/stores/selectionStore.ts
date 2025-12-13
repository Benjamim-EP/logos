import { create } from 'zustand'
import type { Note } from '@/types/galaxy'

interface SelectionState {
  selectedNote: Note | null
  setSelectedNote: (note: Note | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNote: null,
  setSelectedNote: (note) => set({ selectedNote: note }),
}))