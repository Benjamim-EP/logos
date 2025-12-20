import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export interface LibraryBook {
  id: string
  title: string
  preview: string
  highlightsCount: number
  lastRead: string
}

export function useLibraryBooks() {
  return useQuery({
    queryKey: ["library", "books"], // Chave única de cache
    queryFn: async () => {
      // Chama o endpoint que criamos no Library Service
      const { data } = await api.get<LibraryBook[]>("/library/books")
      return data
    }
  })
}