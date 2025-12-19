import { create } from 'zustand'

interface User {
  id: string
  name: string
  role: string
  token?: string // <--- Novo campo Token
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  
  // Substituimos 'login' por 'setAuthData' que é mais genérico
  setAuthData: (data: { isAuthenticated: boolean, user: User | null }) => void
  
  // O logout agora precisa limpar o Zustand E o Keycloak (será tratado no componente)
  logout: () => void 
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,

  setAuthData: (data) => set(data),

  logout: () => set({ isAuthenticated: false, user: null }),
}))