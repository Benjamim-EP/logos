import type { Cluster, Note, SubCluster } from "@/types/galaxy"

// 1. Configuração Macro (Galáxias)
const CLUSTERS_CONFIG = [
  { id: "java", label: "Java Ecosystem", color: "#f89820" },
  { id: "ai", label: "Artificial Intelligence", color: "#3b82f6" },
  { id: "arch", label: "Software Arch", color: "#10b981" },
  { id: "theology", label: "Theology", color: "#8b5cf6" },
  { id: "history", label: "History", color: "#ef4444" },
]

// 2. Configuração Micro (Sistemas Solares por Galáxia)
const SUBCLUSTERS_CONFIG: Record<string, string[]> = {
  java: ["Spring Boot", "JVM Internals", "Concurrency", "Quarkus"],
  ai: ["LLMs", "Computer Vision", "Neural Networks", "Ethics"],
  arch: ["Microservices", "Design Patterns", "DDD", "Cloud Native"],
  theology: ["Systematics", "Biblical Studies", "History of Church"],
  history: ["Ancient Rome", "World War II", "Industrial Rev"],
}

// Utilitário de Gauss (Curva de Sino)
function randomNormal(mean: number, stdDev: number) {
  const u = 1 - Math.random()
  const v = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return z * stdDev + mean
}

// Utilitário para clarear/escurecer cor (para os subclusters)
function adjustColor(color: string, amount: number) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

export const generateUniverse = (count: number): { clusters: Cluster[], subClusters: SubCluster[], notes: Note[] } => {
  
  // A. Gerar Galáxias (Clusters)
  const clusters: Cluster[] = CLUSTERS_CONFIG.map((config, index) => {
    const angle = (index / CLUSTERS_CONFIG.length) * 2 * Math.PI
    const radius = 2500 // Distância entre galáxias
    return {
      ...config,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  })

  // B. Gerar Sistemas Solares (SubClusters)
  let subClusters: SubCluster[] = []
  
  clusters.forEach(cluster => {
    const subNames = SUBCLUSTERS_CONFIG[cluster.id] || []
    
    subNames.forEach((name, index) => {
      // Orbitam o centro da galáxia
      const angle = (index / subNames.length) * 2 * Math.PI + (Math.random() * 0.5) // Offset aleatório
      const orbitRadius = 600 + Math.random() * 200 // Distância do centro da galáxia
      
      subClusters.push({
        id: `${cluster.id}-${index}`,
        label: name,
        clusterId: cluster.id,
        color: adjustColor(cluster.color, (index % 2 === 0 ? 40 : -20)), // Variação de cor
        x: cluster.x + Math.cos(angle) * orbitRadius,
        y: cluster.y + Math.sin(angle) * orbitRadius,
        radius: 150 // Raio de gravidade visual
      })
    })
  })

  // C. Gerar Notas (Estrelas)
  const notes: Note[] = Array.from({ length: count }).map((_, i) => {
    // 1. Escolhe Galáxia
    const cluster = clusters[Math.floor(Math.random() * clusters.length)]
    
    // 2. Decide: Sistema Solar (70%) ou Poeira da Galáxia (30%)?
    const mySubClusters = subClusters.filter(sc => sc.clusterId === cluster.id)
    const isInSystem = Math.random() > 0.3 && mySubClusters.length > 0
    
    let x, y, title, subClusterId

    if (isInSystem) {
      // --- GRAVIDADE FORTE (Dentro do Sistema Solar) ---
      const sub = mySubClusters[Math.floor(Math.random() * mySubClusters.length)]
      subClusterId = sub.id
      
      // Dispersão baixa (120) = Fica bem juntinho do sistema
      x = randomNormal(sub.x, 120)
      y = randomNormal(sub.y, 120)
      title = `Note on ${sub.label} #${i}`
    } else {
      // --- GRAVIDADE FRACA (Poeira da Galáxia) ---
      // Dispersão alta (700) = Espalhado pela galáxia toda
      x = randomNormal(cluster.x, 700)
      y = randomNormal(cluster.y, 700)
      title = `General ${cluster.label} Idea #${i}`
    }

    return {
      id: `note-${i}`,
      title,
      preview: "Conteúdo gerado via Fractal Gravity Engine...",
      tags: [cluster.label],
      createdAt: new Date().toISOString(),
      x,
      y,
      z: Math.random() * 1.5 + 0.5, // Tamanho variado
      clusterId: cluster.id,
      subClusterId // Pode ser undefined
    }
  })

  return { clusters, subClusters, notes }
}