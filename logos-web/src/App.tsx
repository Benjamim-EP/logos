import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
          Logos
        </h1>
        <p className="text-gray-400">Knowledge Galaxy System</p>
        <Button variant="secondary" className="animate-pulse">
          Entrar no Sistema
        </Button>
      </div>
    </div>
  )
}

export default App