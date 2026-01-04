import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner"
import { getNearestNotes } from "@/lib/math" // Certifique-se de ter atualizado o math.ts conforme passo anterior

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

// Estrutura para o cálculo de força vindo do Backend
interface PhysicsLink {
  galaxyId: string
  highlightId: string
  score: number
}

interface GalaxyState {
  // --- DADOS ---
  allNotes: Note[]
  clusters: Cluster[]
  subClusters: SubCluster[]
  
  // --- ESTADOS DE UI ---
  isLoading: boolean
  isGravityLoading: boolean
  focusNode: Note | null
  tempCentralizedId: string | null // ID da nota que está agindo como centro temporário
  viewMode: ViewMode
  
  // --- FILTROS ---
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  // --- ACTIONS ---
  initializeUniverse: () => Promise<void>
  createGalaxy: (name: string, x: number, y: number) => Promise<void>
  centralizeNode: (note: Note | null) => void // Ação de gravidade temporária
  
  setFocusNode: (note: Note | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleCluster: (clusterId: string) => void
  setSortOrder: (order: SortOrder) => void
  
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
  tempCentralizedId: null,
  viewMode: 'galaxy',
  
  activeClusterIds: [],
  sortOrder: 'newest',
  maxVisibleNotes: 800, // Limite seguro para WebGL/DOM

  /**
   * INICIALIZAÇÃO: Carrega Estrelas, Galáxias e Links, e aplica a Física.
   */
  initializeUniverse: async () => {
    // Evita recarregar se já está carregando, mas permite se for um refresh forçado (ex: após criar galáxia)
    if (get().isLoading) return;

    set({ isLoading: true, tempCentralizedId: null })
    
    try {
        console.log("🌌 Carregando Universo...")
        
        // 1. Busca Paralela (Performance)
        const [starsRes, stateRes] = await Promise.all([
            api.get('/galaxy/stars'),
            api.get('/galaxy/management/state')
        ])
        
        const stars = starsRes.data
        const { galaxies, links } = stateRes.data

        console.log(`📡 Dados: ${stars.length} estrelas, ${galaxies.length} galáxias, ${links.length} conexões.`)

        // 2. Mapeia Galáxias
        const clusters: Cluster[] = galaxies.map((g: any) => ({
            id: String(g.id),
            label: g.name,
            color: g.color || '#ffffff',
            x: g.x || 0,
            y: g.y || 0,
            isActive: g.isActive
        }))

        // 3. Indexa Links para acesso O(1)
        const linkMap = new Map<string, PhysicsLink[]>()
        links.forEach((l: any) => {
            if (!linkMap.has(l.highlightId)) {
                linkMap.set(l.highlightId, [])
            }
            linkMap.get(l.highlightId)?.push(l)
        })

        // 4. MOTOR FÍSICO (Cálculo de Posição)
        const notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             const myLinks = linkMap.get(starId)

             // A. Posição Padrão (Caos / Big Bang)
             // Distribuído em um anel externo para não poluir o centro
             const chaosTheta = Math.random() * 2 * Math.PI;
             const chaosR = 2000 + Math.random() * 1500;
             
             let x = chaosR * Math.cos(chaosTheta);
             let y = chaosR * Math.sin(chaosTheta);
             let tags = [star.type];
             let clusterId = "chaos";

             // B. Aplicação de Forças (Se tiver links com galáxias)
             if (myLinks && myLinks.length > 0) {
                 let vectorX = 0;
                 let vectorY = 0;
                 let totalScore = 0;
                 const activeTags: string[] = [];

                 myLinks.forEach(link => {
                     const galaxy = clusters.find(c => c.id === link.galaxyId)
                     if (galaxy) {
                         // A Galáxia puxa a estrela. Força = Posição * Score
                         vectorX += galaxy.x * link.score;
                         vectorY += galaxy.y * link.score;
                         totalScore += link.score;
                         activeTags.push(galaxy.label);
                     }
                 })

                 if (totalScore > 0) {
                     // Baricentro (Centro de Massa Ponderado)
                     const centerX = vectorX / totalScore;
                     const centerY = vectorY / totalScore;

                     // Dispersão: Notas muito relevantes ficam perto do centro.
                     // Notas pouco relevantes orbitam mais longe.
                     // Adicionamos aleatoriedade angular para formar uma "nuvem" e não uma linha.
                     const relevanceFactor = Math.min(totalScore, 1.5); // Cap em 1.5
                     const dispersionRadius = 400 * (1.5 - relevanceFactor); 
                     const randomAngle = Math.random() * 2 * Math.PI;

                     x = centerX + (Math.cos(randomAngle) * dispersionRadius);
                     y = centerY + (Math.sin(randomAngle) * dispersionRadius);
                     
                     tags = [...new Set([...tags, ...activeTags])];
                     clusterId = "organized"; 
                 }
             }

             return {
                id: starId,
                title: star.documentTitle || "Documento Sem Título",
                preview: star.content || "",
                tags: tags,
                createdAt: star.createdAt,
                x: x,
                y: y,
                z: Math.random() * 2 + 0.5, // Variação de tamanho visual
                affinities: {}, // Pode ser populado se precisar de debug visual
                clusterId: clusterId,
                documentId: star.documentId // Importante para as cores e agrupamento
             }
        })

        // 5. Atualiza Store
        set({ 
            allNotes: notes, 
            clusters: clusters,
            subClusters: [],
            // Ativa todas as galáxias por padrão para mostrar o universo completo
            activeClusterIds: [...clusters.map(c => c.id), "chaos"],
            isLoading: false 
        })

    } catch (error) {
        console.error("❌ Erro crítico ao inicializar universo:", error)
        toast.error("Falha ao carregar galáxia.")
        set({ isLoading: false })
    }
  },

  /**
   * CRIAÇÃO DE GALÁXIA
   */
  createGalaxy: async (name: string, x: number, y: number) => {
    if (!name.trim()) return

    set({ isGravityLoading: true })

    try {
        // 1. Salva no Backend
        await api.post('/galaxy/management', {
            name,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16),
            x,
            y
        })
        
        toast.success(`Galáxia "${name}" criada!`)

        // 2. Recarrega o Universo para aplicar a física com os novos links gerados pela IA
        get().initializeUniverse()

    } catch (e: any) {
        console.error("Erro ao criar galáxia", e)
        const msg = e.response?.data?.message || "Erro desconhecido"
        toast.error("Falha ao criar galáxia", { description: msg })
    } finally {
        set({ isGravityLoading: false })
    }
  },

  /**
   * CENTRALIZAR NÓ (GRAVIDADE TEMPORÁRIA)
   * Atrai notas similares para perto da nota selecionada.
   */
  centralizeNode: (note: Note | null) => {
    const { allNotes } = get()
    
    // Se passar null, reseta para o estado original (recalcula do zero ou restaura backup)
    // Aqui optamos por recalcular via initializeUniverse para simplicidade e consistência
    if (!note) {
        get().initializeUniverse()
        return
    }

    // 1. Encontra vizinhos
    // Nota: math.ts deve estar implementado corretamente
    const neighbors = getNearestNotes(note, allNotes, 10)
    const neighborIds = new Set(neighbors.map(n => n.id))

    // 2. Aplica transformação nas posições
    const newNotes = allNotes.map(n => {
        // A nota central não se move
        if (n.id === note.id) return { ...n, opacity: 1, z: 3 }
        
        if (neighborIds.has(n.id)) {
            // Interpolação Linear (LERP): Move o vizinho 85% do caminho em direção ao centro
            const targetX = note.x + (Math.random() - 0.5) * 100 // Pequeno jitter para não sobrepor
            const targetY = note.y + (Math.random() - 0.5) * 100
            
            return {
                ...n,
                x: n.x + (targetX - n.x) * 0.9,
                y: n.y + (targetY - n.y) * 0.9,
                z: 2, // Destaca vizinhos
                opacity: 1
            }
        }
        
        // Notas não relacionadas ficam transparentes (Foco)
        return { ...n, opacity: 0.1 }
    })

    set({ 
        allNotes: newNotes, 
        tempCentralizedId: note.id 
    })
  },

  // --- ACTIONS SIMPLES ---
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
    
    let filteredNotes = state.allNotes

    // Lógica de filtro por cluster (se necessário no futuro)
    // Atualmente mostramos tudo, a menos que o usuário use filtros manuais do GalaxyControls
    
    // Ordenação (Z-Index para renderização)
    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })

    // Paginação Virtual / Limite de Renderização
    const visibleNotes = filteredNotes.slice(0, state.maxVisibleNotes)

    return { 
        visibleNotes, 
        visibleClusters: state.clusters, 
        visibleSubClusters: state.subClusters 
    }
  }
}))