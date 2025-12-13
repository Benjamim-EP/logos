import type { Cluster } from "@/types/galaxy"

interface ClusterNodeProps {
  cluster: Cluster
  zoomLevel: number
}

export function ClusterNode({ cluster, zoomLevel }: ClusterNodeProps) {
  // Lógica de Opacidade Invertida:
  // - Longe (Zoom < 1): Opacidade 1 (Visível)
  // - Perto (Zoom > 2.5): Opacidade 0 (Desaparece para focar nas notas)
  // Ajustei para 2.5 para demorar mais a sumir
  const opacity = Math.max(0, 1 - (zoomLevel - 0.5) / 2)

  // Se a opacidade for zero, não renderiza para não bloquear cliques
  if (opacity <= 0) return null

  return (
    <div
      className="absolute flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300"
      style={{
        left: cluster.x,
        top: cluster.y,
        transform: 'translate(-50%, -50%)', // Centraliza exato no ponto
        opacity: opacity,
        zIndex: 0 // Fica atrás das estrelas
      }}
    >
      {/* Glow de Fundo Gigante (A "Nebulosa") */}
      <div 
        className="absolute rounded-full blur-[120px]"
        style={{ 
          backgroundColor: cluster.color, 
          width: '800px', 
          height: '800px',
          opacity: 0.2 
        }}
      />
      
      {/* Título do Cluster */}
      <h2 
        className="text-6xl md:text-8xl font-black tracking-tighter text-white"
        style={{ 
          textShadow: `0 0 60px ${cluster.color}, 0 0 10px rgba(0,0,0,0.8)`
        }}
      >
        {cluster.label}
      </h2>
    </div>
  )
}