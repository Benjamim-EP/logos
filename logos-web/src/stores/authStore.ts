import { create } from 'zustand'

interface User {
  id: string
  name: string
  role: 'explorer' | 'admin'
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (email: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  
  // Simulação de Login (Mock)
  login: (email: string) => {
    // Aqui futuramente chamaremos a API Java
    console.log(`🚀 Iniciando sessão para: ${email}`)
    set({
      isAuthenticated: true,
      user: {
        id: '1',
        name: email.split('@')[0], // Pega o nome do email
        role: 'explorer'
      }
    })
  },

  logout: () => set({ isAuthenticated: false, user: null }),
}))