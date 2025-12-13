// src/features/galaxy/utils/generator.ts
// src/features/galaxy/utils/generator.ts
import type { Cluster, Note } from "@/types/galaxy"

// Configuração dos Temas (Sistemas Solares)
const TOPICS = [
  { id: "java", label: "Java Ecosystem", color: "#f89820" }, // Laranja
  { id: "ai", label: "Artificial Intelligence", color: "#3b82f6" }, // Azul
  { id: "arch", label: "Software Arch", color: "#10b981" }, // Verde
  { id: "theology", label: "Theology", color: "#8b5cf6" }, // Roxo
  { id: "history", label: "History", color: "#ef4444" }, // Vermelho
]

// Palavras-chave para dar "realismo" aos títulos
const PREFIXES = ["Introduction to", "Advanced", "Notes on", "Analysis of", "Concepts:"]
const SUFFIXES = ["Patterns", "Basics", "Deep Dive", "Structure", "Overview"]

function randomNormal(mean: number, stdDev: number) {
  // Transformada de Box-Muller para distribuição normal (curva de sino)
  // Isso faz os pontos ficarem mais densos no centro e espalhados nas bordas
  const u = 1 - Math.random()
  const v = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return z * stdDev + mean
}

export const generateUniverse = (count: number): { clusters: Cluster[], notes: Note[] } => {
  const clusters: Cluster[] = TOPICS.map((topic, index) => {
    const angle = (index / TOPICS.length) * 2 * Math.PI
    // REDUZIR O RAIO DO UNIVERSO (De 2000 para 1200)
    // Isso traz os sistemas solares mais para perto um do outro
    const radius = 1200 
    
    return {
      ...topic,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  })

  const notes: Note[] = Array.from({ length: count }).map((_, i) => {
    const cluster = clusters[Math.floor(Math.random() * clusters.length)]
    
    // REDUZIR A DISPERSÃO (De 600 para 250)
    // Isso faz as estrelas ficarem "agarradinhas" no cluster
    const x = randomNormal(cluster.x, 250)
    const y = randomNormal(cluster.y, 250)
    
    // Aumentar o fator Z para elas variarem mais de tamanho (0.8 a 2.5)
    const z = Math.random() * 1.7 + 0.8 

    const title = `${PREFIXES[i % PREFIXES.length]} ${cluster.label} ${SUFFIXES[i % SUFFIXES.length]}`

    return {
      id: `note-${i}`,
      title,
      preview: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor...",
      tags: [cluster.label, "Learning"],
      createdAt: new Date().toISOString(),
      x,
      y,
      z,
      clusterId: cluster.id
    }
  })

  return { clusters, notes }
}