// src/types/galaxy.ts

export interface Cluster {
  id: string
  label: string
  color: string
  x: number // Centro do cluster no universo
  y: number
}

export interface Note {
  id: string
  title: string
  preview: string
  
  // Metadados
  tags: string[]
  createdAt: string
  
  // Coordenadas Vetoriais (Simuladas)
  x: number
  y: number
  z: number // Para efeito de profundidade/tamanho (3D fake)
  
  // Relacionamento
  clusterId: string
}