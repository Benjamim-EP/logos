import type { Cluster } from "@/types/galaxy"
import { motion } from "framer-motion"
import { Map } from "lucide-react"

interface MinimapProps {
  clusters: Cluster[]
  onNavigate: (x: number, y: number) => void
}

export function Minimap({ clusters, onNavigate }: MinimapProps) {
  // Configurações de Escala
  const MAP_SIZE = 140 // Tamanho em pixels do minimapa
  const UNIVERSE_BOUNDS = 4000 // Limite aproximado do universo gerado
  
  // Converte coordenada do Universo para o Minimapa (0 a 140)
  const scale = (val: number) => {
    // Normaliza de -4000..4000 para 0..1
    const normalized = (val + UNIVERSE_BOUNDS) / (UNIVERSE_BOUNDS * 2)
    // Escala para 0..MAP_SIZE
    return normalized * MAP_SIZE
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <Map className="w-3 h-3" /> Navegação Rápida
      </div>
      
      {/* Container do Radar */}
      <div 
        className="w-full aspect-square bg-black/60 rounded-lg border border-white/10 relative overflow-hidden group cursor-crosshair"
      >
        {/* Grid de Fundo (Estético) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
        
        {/* Centro (Mira) */}
        <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-white/20 -translate-x-1/2 -translate-y-1/2" />

        {/* Os Pontos das Galáxias */}
        {clusters.map((cluster) => (
          <motion.button
            key={cluster.id}
            whileHover={{ scale: 1.5 }}
            onClick={() => onNavigate(cluster.x, cluster.y)}
            className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 border border-black/50 shadow-lg transition-transform"
            style={{
              left: scale(cluster.x),
              top: scale(cluster.y),
              backgroundColor: cluster.color,
              boxShadow: `0 0 8px ${cluster.color}`
            }}
            title={`Ir para ${cluster.label}`}
          />
        ))}
      </div>
      
      <p className="text-[9px] text-gray-600 mt-1 text-center">
        Clique nos pontos para viajar
      </p>
    </div>
  )
}