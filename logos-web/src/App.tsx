import { GalaxyCanvas } from "@/features/galaxy/GalaxyCanvas"
import { LoginPage } from "@/features/auth/LoginPage"
import { useAuthStore } from "@/stores/authStore"

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return <>{isAuthenticated ? <GalaxyCanvas /> : <LoginPage />}</>
}

export default App