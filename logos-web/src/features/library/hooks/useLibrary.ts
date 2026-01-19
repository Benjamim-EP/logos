import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

export interface LibraryBook {
  id: string
  title: string
  preview: string
  highlightsCount: number
  lastRead: string
  coverUrl?: string
}

export function useLibraryBooks() {
  const isGuest = useAuthStore((state) => state.isGuest);

  return useQuery({
    queryKey: ["library", "books", isGuest], 
    queryFn: async () => {
      if (isGuest) {
        return [{
            id: "sample-book", 
            title: "Logos Platform - Whitepaper",
            preview: "Documento de demonstração do sistema.",
            highlightsCount: 0,
            lastRead: new Date().toISOString(),
            coverUrl: ""
        }] as LibraryBook[];
      }
      const { data } = await api.get<LibraryBook[]>("/library/books")
      return data
    }
  })
}