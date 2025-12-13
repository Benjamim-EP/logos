export interface Cluster {
  id: string
  label: string
  color: string
  x: number
  y: number
}

export interface Note {
  id: string
  title: string
  preview: string
  
  // Metadados
  tags: string[]
  createdAt: string
  
  // Coordenadas Vetoriais
  x: number
  y: number
  z: number
  
  // Relacionamento
  clusterId: string

  // --- CORREÇÃO AQUI ---
  // Adicionamos como opcional (?) porque nem sempre a nota tem distância calculada
  distance?: number 
}