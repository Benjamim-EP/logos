import { useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { LoginPage } from "@/features/auth/LoginPage"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

function GalaxyView() {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  
  // Hook da Galáxia
  const { notes, clusters, initializeGalaxy, isLoading } = useGalaxyStore()

  // Inicializa ao montar o componente
  useEffect(() => {
    if (notes.length === 0) {
      initializeGalaxy(150) // Gera 150 notas para teste
    }
  }, [])

  return (
    <div className="h-screen w-full bg-[#050505] text-white p-8 overflow-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Universo de {user?.name}
          </h1>
          <p className="text-gray-400">
            {isLoading ? "Calculando vetores..." : `${notes.length} anotações mapeadas em ${clusters.length} dimensões.`}
          </p>
        </div>
        <Button variant="outline" onClick={logout} className="border-red-900 text-red-400 hover:bg-red-950">
          Sair
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-20">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mostra apenas as 6 primeiras para não poluir, só para debug */}
          {notes.slice(0, 6).map((note) => (
            <div key={note.id} className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-blue-300">{note.title}</h3>
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">
                  {note.tags[0]}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">
                Vetor: [X: {note.x.toFixed(0)}, Y: {note.y.toFixed(0)}]
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return <>{isAuthenticated ? <GalaxyView /> : <LoginPage />}</>
}

export default App