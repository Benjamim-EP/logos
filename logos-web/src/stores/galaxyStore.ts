// #logos-web/src/stores/galaxyStore.ts

import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner"

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'


interface PhysicsLink {
  galaxyId: string
  highlightId: string
  score: number
}

interface GalaxyState {
  // Dados do Universo
  allNotes: Note[]
  clusters: Cluster[]
  subClusters: SubCluster[] // Mantido para compatibilidade futura (sistemas solares)
  
  // Estados de UI
  isLoading: boolean
  isGravityLoading: boolean // Indica que estamos criando uma galáxia/calculando gravidade
  focusNode: Note | null
  viewMode: ViewMode
  
  // Filtros e Configurações
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  // --- ACTIONS ---
  
  // Carrega Estrelas E Galáxias do Banco
  initializeUniverse: () => Promise<void>
  
  // Cria uma nova Galáxia Persistente
  createGalaxy: (name: string, x: number, y: number) => Promise<void>
  
  // Navegação e Visualização
  setFocusNode: (note: Note | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleCluster: (clusterId: string) => void
  setSortOrder: (order: SortOrder) => void
  
  // Seletor de Dados Visíveis
  getVisibleData: () => { 
    visibleNotes: Note[], 
    visibleClusters: Cluster[],
    visibleSubClusters: SubCluster[] 
  }
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  allNotes: [],
  clusters: [],
  subClusters: [],
  isLoading: false,
  isGravityLoading: false,
  focusNode: null,
  viewMode: 'galaxy',
  
  activeClusterIds: [],
  sortOrder: 'newest',
  maxVisibleNotes: 400,

  /**
   * INICIALIZAÇÃO DO UNIVERSO (Estrelas + Galáxias Persistidas)
   * Substitui o antigo initializeGalaxy.
   */
  initializeUniverse: async () => {
    if (get().allNotes.length > 0 || get().isLoading) return;

    set({ isLoading: true })
    
    try {
        console.log("🌌 Carregando Matriz Gravitacional...")
        
        // 1. Busca Estrelas (Dados Brutos) e Estado (Galáxias + Links)
        const [starsRes, stateRes] = await Promise.all([
            api.get('/galaxy/stars'),
            api.get('/galaxy/management/state') // Novo endpoint
        ])
        
        const stars = starsRes.data
        const { galaxies, links } = stateRes.data // DTO do Java

        console.log(`📡 Telemetria: ${stars.length} estrelas, ${galaxies.length} galáxias, ${links.length} conexões.`)

        // 2. Mapeia Galáxias
        const clusters: Cluster[] = galaxies.map((g: any) => ({
            id: String(g.id),
            label: g.name,
            color: g.color,
            x: g.x,
            y: g.y,
            isActive: g.isActive
        }))

        // 3. MAPA DE VETORES (Indexação para performance O(1))
        // Cria um mapa: highlightId -> lista de links
        const linkMap = new Map<string, PhysicsLink[]>()
        links.forEach((l: any) => {
            if (!linkMap.has(l.highlightId)) {
                linkMap.set(l.highlightId, [])
            }
            linkMap.get(l.highlightId)?.push(l)
        })

        // 4. CALCULA A POSIÇÃO DAS ESTRELAS (MOTOR FÍSICO)
        const notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             const myLinks = linkMap.get(starId)

             // Posição Padrão (Caos)
             const chaosTheta = Math.random() * 2 * Math.PI;
             const chaosR = 1500 + Math.random() * 1000;
             let x = chaosR * Math.cos(chaosTheta);
             let y = chaosR * Math.sin(chaosTheta);
             let tags = [star.type];
             let clusterId = "chaos";

             // SE TIVER LINKS: Aplica a Soma Vetorial (Cabo de Guerra)
             if (myLinks && myLinks.length > 0) {
                 let vectorX = 0;
                 let vectorY = 0;
                 let totalScore = 0;
                 const activeTags: string[] = [];

                 myLinks.forEach(link => {
                     const galaxy = clusters.find(c => c.id === link.galaxyId)
                     if (galaxy) {
                         // Soma Vetorial Ponderada
                         vectorX += galaxy.x * link.score;
                         vectorY += galaxy.y * link.score;
                         totalScore += link.score;
                         activeTags.push(galaxy.label);
                     }
                 })

                 if (totalScore > 0) {
                     // Calcula o Baricentro (Centro de Massa)
                     const centerX = vectorX / totalScore;
                     const centerY = vectorY / totalScore;

                     // Aplica Dispersão (Para não ficarem todas empilhadas no ponto exato)
                     // Quanto maior o score total, menor a dispersão (mais "firme" a atração)
                     const dispersion = 300 * (1 / Math.max(totalScore, 0.5)); 
                     const angle = Math.random() * 2 * Math.PI;

                     x = centerX + (Math.cos(angle) * dispersion);
                     y = centerY + (Math.sin(angle) * dispersion);
                     
                     tags = [...new Set([...tags, ...activeTags])];
                     clusterId = "organized"; // Marca como organizada
                 }
             }

             return {
                id: starId,
                title: star.documentTitle || "Documento",
                preview: star.content || "",
                tags: tags,
                createdAt: star.createdAt,
                x: x,
                y: y,
                z: Math.random() * 2 + 0.5,
                clusterId: clusterId,
                documentId: star.documentId
             }
        })

        set({ 
            allNotes: notes, 
            clusters: clusters,
            subClusters: [],
            activeClusterIds: [...clusters.map(c => c.id), "chaos"],
            isLoading: false 
        })

    } catch (error) {
        console.error("❌ Erro ao calcular física do universo:", error)
        set({ isLoading: false })
    }
  },

  

  /**
   * CRIAÇÃO DE GALÁXIA PERSISTENTE
   * Envia para o Backend, que salva, vetoriza e cria links.
   */
  createGalaxy: async (name: string, x: number, y: number) => {
    if (!name.trim()) return

    set({ isGravityLoading: true })

    try {
        console.log(`💾 Solicitando nova galáxia: "${name}" em (${x.toFixed(0)}, ${y.toFixed(0)})`)
        
        // 1. Chama o Backend (GalaxyManagementController)
        const { data: newGalaxy } = await api.post('/galaxy/management', {
            name,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), // Cor gerada no front (ou deixe o back decidir)
            x,
            y
        })
        
        toast.success(`Galáxia "${newGalaxy.name}" criada!`, {
            description: "A IA está calculando as atrações gravitacionais e salvando no banco."
        })

        // 2. Atualiza UI Imediatamente (Optimistic Update)
        // Adicionamos a galáxia visualmente para o usuário não esperar o refresh
        const cluster: Cluster = {
            id: String(newGalaxy.id),
            label: newGalaxy.name,
            color: newGalaxy.color,
            x: newGalaxy.x,
            y: newGalaxy.y,
            isActive: true
        }

        set(state => ({
            clusters: [...state.clusters, cluster],
            activeClusterIds: [...state.activeClusterIds, cluster.id],
            isGravityLoading: false
        }))
        
        // OBS: As estrelas só serão puxadas após implementarmos o endpoint de "Universe State Refresh" 
        // ou recarregarmos a página, pois precisamos dos Links criados pelo backend.

    } catch (e: any) {
        console.error("Erro ao criar galáxia", e)
        const msg = e.response?.data?.message || e.message || "Erro desconhecido"
        
        // Tratamento específico para duplicidade
        if (msg.includes("já possui")) {
            toast.warning("Galáxia Duplicada", { description: msg })
        } else {
            toast.error("Falha ao criar galáxia", { description: msg })
        }
        
        set({ isGravityLoading: false })
    }
    get().initializeUniverse() 
  },

  setFocusNode: (note) => set({ focusNode: note }),
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleCluster: (clusterId) => set((state) => {
    const isActive = state.activeClusterIds.includes(clusterId)
    const newIds = isActive 
      ? state.activeClusterIds.filter(id => id !== clusterId)
      : [...state.activeClusterIds, clusterId]
    return { activeClusterIds: newIds }
  }),

  setSortOrder: (order) => set({ sortOrder: order }),

  getVisibleData: () => {
    const state = get()
    
    // Fallback simples: se não houver cluster ativo, mostra tudo
    const effectiveClusterIds = state.activeClusterIds.length > 0
      ? state.activeClusterIds
      : ["chaos", ...state.clusters.map(c => c.id)]

    // Na fase de persistência, mostramos todas as notas
    // A filtragem visual acontecerá quando implementarmos a física de atração baseada em Links
    let filteredNotes = state.allNotes

    // Ordenação (Z-Index)
    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { 
        visibleNotes, 
        visibleClusters: state.clusters, 
        visibleSubClusters: state.subClusters 
    }
  }
}))