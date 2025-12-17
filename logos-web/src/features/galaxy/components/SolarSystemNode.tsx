import type { SubCluster } from "@/types/galaxy"
import { motion } from "framer-motion"

interface SolarSystemNodeProps {
  subCluster: SubCluster
  zoomLevel: number
}

export function SolarSystemNode({ subCluster, zoomLevel }: SolarSystemNodeProps) {
  // 1. LOD: Controle de Visibilidade
  // Só aparece se entrarmos um pouco na galáxia (zoom > 0.4)
  if (zoomLevel < 0.4) return null

  // Cálculo de Opacidade para Fade In/Out suave
  // Entra suavemente entre 0.4 e 0.6
  // Sai suavemente depois de 3.0
  let opacity = 1
  if (zoomLevel < 0.6) {
    opacity = (zoomLevel - 0.4) / 0.2
  } else if (zoomLevel > 2.5) {
    opacity = Math.max(0, 1 - (zoomLevel - 2.5) / 1)
  }

  if (opacity <= 0) return null

  // Tamanho visual do anel de gravidade (baseado no raio definido no gerador)
  const size = subCluster.radius * 2

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: opacity, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="absolute pointer-events-none flex items-center justify-center"
      style={{
        left: subCluster.x,
        top: subCluster.y,
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 5 // Fica acima da Galáxia, mas abaixo das Estrelas
      }}
    >
      {/* 
          O ANEL ORBITAL (GRAVIDADE VISUAL) 
          Um círculo sutil que delimita a área do assunto
      */}
      <div 
        className="absolute inset-0 rounded-full border border-dashed"
        style={{ 
          borderColor: subCluster.color, 
          opacity: 0.15,
          borderWidth: '1px'
        }}
      />
      
      {/* O NÚCLEO BRILHANTE (CENTRO) */}
      <div 
        className="absolute w-2 h-2 rounded-full"
        style={{ 
            backgroundColor: subCluster.color, 
            boxShadow: `0 0 20px 5px ${subCluster.color}` 
        }}
      />

      {/* O TÍTULO DO SISTEMA */}
      {/* Aplicamos escala inversa para o texto permanecer legível sem ficar gigante */}
      <h3 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-bold tracking-widest uppercase text-white whitespace-nowrap"
        style={{ 
            transform: `scale(${1 / Math.sqrt(zoomLevel)}) translate(0, -200%)`, // Fica um pouco acima do centro
            textShadow: `0 0 10px ${subCluster.color}`,
            fontSize: '12px',
            color: subCluster.color
        }}
      >
        {subCluster.label}
      </h3>

    </motion.div>
  )
}