// logos-web/src/types/galaxy.ts

export interface Cluster {
  id: string
  label: string
  color: string
  x: number
  y: number
  isActive?: boolean 
}

export interface SubCluster {
  id: string
  label: string
  color: string
  x: number
  y: number
  radius: number
  clusterId: string
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
  
  clusterId?: string
  affinities?: Record<string, number>
  documentId?: string 
  
  // --- NOVO: Posição Visual do PDF ---
  // Guardamos como objeto (parseado do JSON do backend)
  position?: {
    boundingRect: any
    rects: any[]
    pageNumber: number
  }
}