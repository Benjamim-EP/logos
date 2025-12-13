import { useEffect, useRef, useState } from "react"
import * as d3 from "d3-zoom"
import { select } from "d3-selection"

export function useGalaxyZoom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const universeRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(0.4)

  useEffect(() => {
    if (!containerRef.current || !universeRef.current) return

    const zoomBehavior = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 12]) // Aumentei um pouco o limite máximo
      .translateExtent([[-6000, -6000], [6000, 6000]])
      .on("zoom", (event) => {
        if (universeRef.current) {
          const { x, y, k } = event.transform
          universeRef.current.style.transform = `translate(${x}px, ${y}px) scale(${k})`
        }
        
        // Otimização: Request Animation Frame para não travar a UI
        requestAnimationFrame(() => {
          setZoomLevel(event.transform.k)
        })
      })

    const selection = select(containerRef.current)
    selection.call(zoomBehavior)
    
    // --- CORREÇÃO 1: Desabilitar Zoom no Duplo Clique ---
    selection.on("dblclick.zoom", null) 

    // Centraliza
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    selection.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.4)
    )

    return () => {
      selection.on(".zoom", null)
    }
  }, [])

  return { containerRef, universeRef, zoomLevel }
}