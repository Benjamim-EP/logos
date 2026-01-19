import axios from "axios"
import { useAuthStore } from "@/stores/authStore"
import i18n from "./i18n"

const api = axios.create({
  baseURL: "http://localhost:8000/api",
})

api.interceptors.request.use((config) => {
  const { user, isGuest, guestUniverse } = useAuthStore.getState()
  
  config.headers['Accept-Language'] = i18n.language || 'en';

  if (isGuest) {
    console.log("👻 [API] Enviando request como Guest");
    config.headers['X-Guest-Mode'] = 'true';
    if (user?.id) {
        config.headers['X-User-Id'] = user.id; 
    }

    if (guestUniverse) {
        config.headers['X-Target-Universe'] = guestUniverse.pineconeFilter;
        config.headers['X-Target-Lang'] = guestUniverse.lang;
    }

  } else if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  
  return config
}, (error) => {
  return Promise.reject(error)
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        const { logout, isGuest } = useAuthStore.getState();
        if (!isGuest) {
            logout();
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
  }
);

export default api