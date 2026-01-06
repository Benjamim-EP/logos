import { create } from 'zustand'
import api from "@/lib/api"

interface UserProfile {
  userId: string
  avatarUrl: string
  bio: string
  // ESTATÍSTICAS REAIS
  stats: {
    highlights: number
    summaries: number
    connections: number
    storageUsed: number  
    storageLimit: number
  }
  // DADOS DO RADAR
  radar: Array<{ subject: string, A: number }>
}

interface UserState {
  profile: UserProfile | null
  isLoading: boolean
  fetchProfile: () => Promise<void>
  updateAvatar: (url: string) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get("/users/profile")
      set({ profile: data, isLoading: false })
    } catch (e) {
      console.error("Erro ao carregar perfil", e)
      set({ isLoading: false })
    }
  },

  updateAvatar: async (url: string) => {
    try {
      // Atualização otimista
      set(state => ({ 
        profile: state.profile ? { ...state.profile, avatarUrl: url } : null 
      }))
      await api.put("/users/profile/avatar", { avatarUrl: url })
    } catch (e) { console.error(e) }
  }
}))