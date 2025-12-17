import { motion } from "framer-motion"
import { Search, Globe, Book, Scale, Landmark, Download, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Mock de Produtos da Loja
const UNIVERSES = [
  {
    id: "bible-complete",
    title: "Bíblia Sagrada Completa",
    category: "Teologia",
    description: "Todos os 66 livros canonizados, com conexões semânticas entre Antigo e Novo Testamento pré-processadas.",
    price: "Grátis",
    nodes: 1189,
    color: "from-yellow-400 to-orange-500",
    icon: Book
  },
  {
    id: "brazilian-law",
    title: "Constituição & Códigos BR",
    category: "Direito",
    description: "CF/88, Código Civil, Penal e Processual. Mapa mental vetorial de leis e jurisprudências.",
    price: "R$ 29,90",
    nodes: 5400,
    color: "from-green-400 to-emerald-600",
    icon: Scale
  },
  {
    id: "aristotle-corpus",
    title: "Corpus Aristotelicum",
    category: "Filosofia",
    description: "Ética a Nicômaco, Metafísica e Política. A base do pensamento ocidental estruturada.",
    price: "Grátis",
    nodes: 850,
    color: "from-blue-400 to-indigo-500",
    icon: Landmark
  },
  {
    id: "world-history",
    title: "História das Civilizações",
    category: "História",
    description: "Timeline vetorial desde a Mesopotâmia até a Guerra Fria.",
    price: "R$ 15,00",
    nodes: 2300,
    color: "from-red-400 to-rose-600",
    icon: Globe
  }
]

export function UniverseStorePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      
      {/* Hero Section da Loja */}
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
          Universo Base
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Não comece do zero. Adquira estruturas de conhecimento pré-processadas por nossa IA 
          e construa suas anotações sobre a sabedoria existente.
        </p>
        
        <div className="max-w-md mx-auto relative mt-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Buscar universos (ex: Direito, Filosofia)..." 
            className="pl-10 bg-white/5 border-white/10 text-white focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Grid de Universos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {UNIVERSES.map((universe, i) => (
          <motion.div
            key={universe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-purple-500/10"
          >
            {/* Header Colorido */}
            <div className={`h-24 bg-gradient-to-br ${universe.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
            
            {/* Ícone Flutuante */}
            <div className="absolute top-12 left-6 w-12 h-12 bg-[#0a0a0a] rounded-xl border border-white/10 flex items-center justify-center shadow-lg">
              <universe.icon className="w-6 h-6 text-white" />
            </div>

            <div className="p-6 pt-8">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="bg-white/5 text-gray-400 hover:bg-white/10">
                  {universe.category}
                </Badge>
                <span className={`text-sm font-bold ${universe.price === 'Grátis' ? 'text-green-400' : 'text-white'}`}>
                  {universe.price}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{universe.title}</h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-3">
                {universe.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                <span>{universe.nodes.toLocaleString()} Nós (Estrelas)</span>
                <span>•</span>
                <span>Vetores Pré-calculados</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  <Eye className="w-4 h-4 mr-2" /> Preview
                </Button>
                <Button className="w-full bg-white text-black hover:bg-gray-200">
                  <Download className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}