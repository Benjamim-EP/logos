import axios from "axios"
import { useAuthStore } from "@/stores/authStore"
import i18n from "./i18n"

// Aponta para o API GATEWAY (8000)
// O Gateway vai rotear:
// /api/library -> Library Service (8082)
// /api/ingestion -> Ingestion API (8080)
const api = axios.create({
  baseURL: "http://localhost:8000/api",
})

// Interceptor: Injeta o Token JWT em TODAS as requisições
api.interceptors.request.use((config) => {
  const user = useAuthStore.getState().user
  
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }

  config.headers['Accept-Language'] = i18n.language || 'en';
  
  return config
}, (error) => {
  return Promise.reject(error)
})

export default api