import axios from "axios"
import { useAuthStore } from "@/stores/authStore"

// Aponta para o GATEWAY (Porta 8000), não para os microsserviços diretos
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// --- INTERCEPTOR DE REQUEST (Middleware) ---
// Antes de sair qualquer requisição, pega o token da Store e cola no Header.
api.interceptors.request.use((config) => {
  const user = useAuthStore.getState().user
  
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  
  return config
}, (error) => {
  return Promise.reject(error)
})

export default api