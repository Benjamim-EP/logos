import { useEffect, useRef, useState } from "react"
import * as d3 from "d3-zoom"
import { select } from "d3-selection"

export function useGalaxyZoom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const universeRef = useRef<HTMLDivElement>(null)
  
  // Estado para controlar LOD (Level of Detail) no React
  const [zoomLevel, setZoomLevel] = useState(0.4)

  useEffect(() => {
    if (!containerRef.current || !universeRef.current) return

    // Configuração do Comportamento de Zoom/Pan
    const zoomBehavior = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 8]) // Zoom Mínimo (0.1x) e Máximo (8x)
      // Limites do universo (para o usuário não se perder no infinito)
      .translateExtent([[-6000, -6000], [6000, 6000]]) 
      .on("zoom", (event) => {
        // --- PERFORMANCE SÊNIOR ---
        // Atualizamos o DOM diretamente via style.transform.
        // Isso roda fora do ciclo de renderização do React (evita re-renders pesados).
        if (universeRef.current) {
          const { x, y, k } = event.transform
          universeRef.current.style.transform = `translate(${x}px, ${y}px) scale(${k})`
        }
        
        // Atualizamos o estado React apenas para lógica de UI (mostrar/esconder textos)
        // O requestAnimationFrame garante que isso não trave a animação
        requestAnimationFrame(() => {
          setZoomLevel(event.transform.k)
        })
      })

    // Aplica o comportamento ao container pai
    const selection = select(containerRef.current)
    selection.call(zoomBehavior)

    // Centraliza a câmera inicialmente (X=0, Y=0 do universo no centro da tela)
    // Precisamos pegar o tamanho da tela para calcular o centro
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    selection.call(
      zoomBehavior.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2) // Move 0,0 para o meio da tela
        .scale(0.4) // Zoom inicial afastado
    )

    // Cleanup
    return () => {
      selection.on(".zoom", null)
    }
  }, [])

  return { containerRef, universeRef, zoomLevel }
}