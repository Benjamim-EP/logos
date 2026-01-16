import { create } from 'zustand'
import api from "@/lib/api"
import { useAuthStore } from './authStore'

interface UserProfile {
  userId: string
  avatarUrl: string
  bio: string
  stats: {
    highlights: number
    summaries: number
    connections: number
    storageUsed: number  
    storageLimit: number
  }
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

    const { isGuest } = useAuthStore.getState()
    if (isGuest) {
        set({ 
            profile: {
                userId: "guest",
                avatarUrl: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Guest",
                bio: "Explorando o Logos em modo visitante.",
                stats: {
                    highlights: 0,
                    summaries: 0,
                    connections: 0,
                    storageUsed: 0,
                    storageLimit: 100
                },
                radar: [
                    { subject: "Curiosidade", A: 100 },
                    { subject: "Acesso", A: 20 },
                    { subject: "Leitura", A: 50 },
                ]
            }, 
            isLoading: false 
        })
        return
    }

    try {
      const { data } = await api.get("/users/profile")
      set({ profile: data, isLoading: false })
    } catch (e) {
      console.error("Erro ao carregar perfil", e)
      set({ isLoading: false })
    }
  },

  updateAvatar: async (url: string) => {
    if (useAuthStore.getState().isGuest) {
        set(state => ({ profile: state.profile ? { ...state.profile, avatarUrl: url } : null }))
        return
    }
    try {
      set(state => ({ 
        profile: state.profile ? { ...state.profile, avatarUrl: url } : null 
      }))
      await api.put("/users/profile/avatar", { avatarUrl: url })
    } catch (e) { console.error(e) }
  }
}))