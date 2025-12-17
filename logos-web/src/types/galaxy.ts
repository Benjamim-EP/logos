export interface Cluster {
  id: string
  label: string
  color: string
  x: number // Coordenada Absoluta do centro da Galáxia
  y: number
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
  
  // Física Vetorial
  x: number
  y: number
  z: number
  
  // Relacionamentos Hierárquicos
  clusterId: string
  subClusterId?: string // Opcional: Algumas notas ficam soltas na galáxia (poeira estelar)
  
  distance?: number // Para cálculos de proximidade
}