// #logos-web/src/types/galaxy.ts

export interface Cluster {
  id: string   // Agora virá do Banco (ex: "1", "2" ou UUID)
  label: string
  color: string
  x: number
  y: number
  // Novo: Controle de estado
  isActive?: boolean 
}

export interface SubCluster {
  id: string
  label: string
  color: string // Pode ser uma variação da cor da Galáxia
  x: number // Coordenada Absoluta do centro do Sistema Solar
  y: number
  radius: number // Tamanho da órbita
  clusterId: string // Pai
}

export interface Note {
  id: string
  title: string
  preview: string
  tags: string[]
  createdAt: string
  
  x: number
  y: number
  z: number
  
  // Agora suporta múltiplas afinidades para a física vetorial
  clusterId?: string // Deprecado em favor de affinities, mas mantido por compatibilidade
  affinities?: Record<string, number> // { "galaxy-java": 0.9, "galaxy-history": 0.5 }
}

export interface SubCluster {
  id: string
  label: string
  color: string
  x: number
  y: number
  radius: number
  clusterId: string
  subClusterId?: string // Opcional: Algumas notas ficam soltas na galáxia (poeira estelar)
}