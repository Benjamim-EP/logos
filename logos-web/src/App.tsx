import { LoginPage } from "@/features/auth/LoginPage"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"

// Placeholder da próxima fase
function GalaxyView() {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white space-y-4">
      <h1 className="text-3xl text-green-400 font-bold">Bem-vindo, {user?.name}! 🚀</h1>
      <p>O universo de dados será renderizado aqui.</p>
      <Button variant="destructive" onClick={logout}>Sair do Sistema</Button>
    </div>
  )
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <>
      {isAuthenticated ? <GalaxyView /> : <LoginPage />}
    </>
  )
}

export default App