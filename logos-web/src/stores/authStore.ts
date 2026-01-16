import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GuestUniverse {
  id: string
  lang: string
  pineconeFilter: string
}

export interface User {
  id: string
  name: string
  role: string
  token?: string
  avatarUrl?: string
}

interface AuthState {
  isAuthenticated: boolean
  isGuest: boolean
  user: User | null
  guestUniverse: GuestUniverse | null
  
  setAuthData: (data: { isAuthenticated: boolean, user: User | null }) => void
  enterGuestMode: () => void
  
  setGuestUniverse: (universeData: GuestUniverse | null) => void
  
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isGuest: false,
      user: null,
      guestUniverse: null,

      setAuthData: (data) => set((state) => ({
        ...state,
        isAuthenticated: data.isAuthenticated,
        isGuest: false, 
        guestUniverse: null,
        user: data.user
      })),

      enterGuestMode: () => {
        const guestId = `guest-${Math.random().toString(36).substring(7)}`;
        set({
            isAuthenticated: true, 
            isGuest: true,
            user: {
                id: guestId,
                name: "Visitante",
                role: "explorer",
                avatarUrl: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${guestId}`
            },
            guestUniverse: null 
        })
      },

      setGuestUniverse: (universeData) => {
        set({ guestUniverse: universeData })
      },

      logout: () => {
        set({ 
          isAuthenticated: false, 
          isGuest: false, 
          user: null, 
          guestUniverse: null 
        })
        localStorage.removeItem('logos-auth-storage') 
      },
    }),
    {
      name: 'logos-auth-storage',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest, 
        guestUniverse: state.guestUniverse,
        user: state.user 
      }),
    }
  )
)