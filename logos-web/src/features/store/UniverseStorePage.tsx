import { motion } from "framer-motion"
import { Search, Globe, Book, Scale, Landmark, Download, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next" // <--- ADD

// Mock mantido (Idealmente viria do backend, mas traduzimos os labels)
const UNIVERSES = [
  { id: "bible-complete", title: "Bíblia Sagrada Completa", category: "Teologia", nodes: 1189, color: "from-yellow-400 to-orange-500", icon: Book },
  { id: "brazilian-law", title: "Constituição & Códigos", category: "Direito", nodes: 5400, color: "from-green-400 to-emerald-600", icon: Scale },
  { id: "aristotle-corpus", title: "Corpus Aristotelicum", category: "Filosofia", nodes: 850, color: "from-blue-400 to-indigo-500", icon: Landmark },
  { id: "world-history", title: "História das Civilizações", category: "História", nodes: 2300, color: "from-red-400 to-rose-600", icon: Globe }
]

export function UniverseStorePage() {
  const { t } = useTranslation() // <--- ADD

  return (
    <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
          {t('store.hero_title')}
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          {t('store.hero_desc')}
        </p>
        
        <div className="max-w-md mx-auto relative mt-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder={t('store.search_placeholder')}
            className="pl-10 bg-white/5 border-white/10 text-white focus:border-purple-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {UNIVERSES.map((universe, i) => (
          <motion.div
            key={universe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-purple-500/10"
          >
            <div className={`h-24 bg-gradient-to-br ${universe.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
            <div className="absolute top-12 left-6 w-12 h-12 bg-[#0a0a0a] rounded-xl border border-white/10 flex items-center justify-center shadow-lg">
              <universe.icon className="w-6 h-6 text-white" />
            </div>

            <div className="p-6 pt-8">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="bg-white/5 text-gray-400 hover:bg-white/10">
                  {universe.category}
                </Badge>
                <span className="text-sm font-bold text-white">
                  {t('store.free')}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{universe.title}</h3>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                <span>{universe.nodes.toLocaleString()} {t('store.nodes')}</span>
                <span>•</span>
                <span>{t('store.vectors')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    className="w-full bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
                >
                  <Eye className="w-4 h-4 mr-2" /> {t('store.preview')}
                </Button>

                <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border border-white/10 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4 mr-2" /> {t('store.add')}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}