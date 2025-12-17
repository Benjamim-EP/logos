import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3-zoom"
import { select } from "d3-selection"

export function useGalaxyZoom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const universeRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(0.2)
  
  // Guardamos a seleção D3 e o comportamento de zoom em Refs para usar fora do useEffect
  const d3Selection = useRef<any>(null)
  const d3ZoomBehavior = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !universeRef.current) return

    const zoomBehavior = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 12])
      .translateExtent([[-8000, -8000], [8000, 8000]]) // Aumentei um pouco a borda
      .on("zoom", (event) => {
        if (universeRef.current) {
          const { x, y, k } = event.transform
          universeRef.current.style.transform = `translate(${x}px, ${y}px) scale(${k})`
        }
        requestAnimationFrame(() => setZoomLevel(event.transform.k))
      })

    const selection = select(containerRef.current)
    selection.call(zoomBehavior)
    
    // Guardar referências para usar no flyTo
    d3Selection.current = selection
    d3ZoomBehavior.current = zoomBehavior

    // Centraliza inicial
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    selection.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.2)
    )

    return () => { selection.on(".zoom", null) }
  }, [])

  // --- NOVA FUNÇÃO: VOA PARA UMA COORDENADA ---
  const flyTo = useCallback((x: number, y: number, k = 1.5) => {
    if (!d3Selection.current || !d3ZoomBehavior.current || !containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Matemática do D3 para centralizar o ponto X,Y:
    // 1. Move o centro da tela (width/2)
    // 2. Aplica o Zoom (scale)
    // 3. Move o universo para que o ponto X,Y fique no centro (-x, -y)
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(k)
      .translate(-x, -y)

    // Transição suave de 2 segundos
    d3Selection.current
      .transition()
      .duration(2000)
      .call(d3ZoomBehavior.current.transform, transform)
  }, [])

  return { containerRef, universeRef, zoomLevel, flyTo }
}