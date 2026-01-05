import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner"
import { getNearestNotes, seededRandom } from "@/lib/math"

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
  createGalaxy: (name: string) => Promise<void>
  deleteGalaxy: (galaxyId: string) => Promise<void>
  centralizeNode: (note: Note | null) => void 
  
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

// --- FUNÇÃO AUXILIAR: Encontrar espaço vazio no universo ---
function findEmptySpace(clusters: Cluster[], minDistance: number = 800): { x: number, y: number } {
    let bestX = 0;
    let bestY = 0;
    let maxDist = 0;
    
    // Se for a primeira, nasce no centro
    if (clusters.length === 0) return { x: 0, y: 0 };

    for (let i = 0; i < 30; i++) {
        const x = (Math.random() - 0.5) * 4000;
        const y = (Math.random() - 0.5) * 4000;
        
        let minDistToOthers = 999999;
        
        for (const c of clusters) {
            const dist = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
            if (dist < minDistToOthers) minDistToOthers = dist;
        }

        if (minDistToOthers > minDistance) {
            return { x, y };
        }

        if (minDistToOthers > maxDist) {
            maxDist = minDistToOthers;
            bestX = x;
            bestY = y;
        }
    }
    return { x: bestX, y: bestY };
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
  maxVisibleNotes: 800,

  /**
   * INICIALIZAÇÃO: Carrega Estrelas (Highlights + Resumos), Galáxias e Links.
   */
  initializeUniverse: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, tempCentralizedId: null })
    
    try {
        console.log("🌌 Carregando Universo...")
        
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

        // 3. Indexa Links
        const linkMap = new Map<string, PhysicsLink[]>()
        links.forEach((l: any) => {
            if (!linkMap.has(l.highlightId)) {
                linkMap.set(l.highlightId, [])
            }
            linkMap.get(l.highlightId)?.push(l)
        })

        // 4. MOTOR FÍSICO
        const notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             const myLinks = linkMap.get(starId)

             // A. Parse seguro do JSON de posição
             let parsedPosition = null;
             try {
                if (star.positionJson) {
                    parsedPosition = JSON.parse(star.positionJson);
                }
             } catch (e) { }

             // B. Dados Básicos
             // O backend envia "type" (TEXT, IMAGE, RESUME). Colocamos nas tags.
             let tags = [star.type]; 
             
             let x = 0;
             let y = 0;
             let clusterId = "chaos";

             // C. Lógica de Posicionamento (Organizado vs Caos)
             if (myLinks && myLinks.length > 0) {
                 let vectorX = 0;
                 let vectorY = 0;
                 let totalScore = 0;
                 const activeTags: string[] = [];

                 myLinks.forEach(link => {
                     const galaxy = clusters.find(c => c.id === link.galaxyId)
                     if (galaxy) {
                         vectorX += galaxy.x * link.score;
                         vectorY += galaxy.y * link.score;
                         totalScore += link.score;
                         activeTags.push(galaxy.label);
                     }
                 })

                 if (totalScore > 0) {
                     // Baricentro
                     const centerX = vectorX / totalScore;
                     const centerY = vectorY / totalScore;

                     // Física de Órbita: "The Orbital Nebula"
                     // Garante que não fiquem em cima do texto (innerSafeZone)
                     const innerSafeZone = 200; 
                     const scoreEffect = (1 - Math.min(totalScore, 0.95)) * 800;
                     const dispersionRadius = innerSafeZone + scoreEffect;
                     
                     // Ângulo Determinístico
                     const stableAngle = seededRandom(starId + "disp", 0, Math.PI * 2);
                     const jitter = seededRandom(starId + "jitter", -50, 50);

                     x = centerX + (Math.cos(stableAngle) * (dispersionRadius + jitter));
                     y = centerY + (Math.sin(stableAngle) * (dispersionRadius + jitter));
                     
                     tags = [...new Set([...tags, ...activeTags])];
                     clusterId = "organized"; 
                 }
             } else {
                 // Caos Estável
                 const stableAngle = seededRandom(starId + "ang", 0, Math.PI * 2);
                 const stableRadius = seededRandom(starId + "rad", 2500, 4500); 
                 
                 x = stableRadius * Math.cos(stableAngle);
                 y = stableRadius * Math.sin(stableAngle);
             }

             return {
                id: starId,
                title: star.documentTitle || "Documento Sem Título",
                preview: star.content || "",
                tags: tags, // Contém "RESUME" se for resumo
                createdAt: star.createdAt,
                x: x,
                y: y,
                z: Math.random() * 2 + 0.5,
                affinities: {},
                clusterId: clusterId,
                documentId: star.documentId,
                position: parsedPosition
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
        console.error("❌ Erro inicialização:", error)
        toast.error("Falha ao carregar galáxia.")
        set({ isLoading: false })
    }
  },

  createGalaxy: async (name: string) => {
    if (!name.trim()) return
    set({ isGravityLoading: true })
    try {
        const currentClusters = get().clusters;
        const pos = findEmptySpace(currentClusters, 1000);
        
        await api.post('/galaxy/management', {
            name,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16),
            x: pos.x,
            y: pos.y
        })
        toast.success(`Galáxia "${name}" criada!`)
        get().initializeUniverse()
    } catch (e: any) {
        toast.error("Falha ao criar galáxia")
    } finally {
        set({ isGravityLoading: false })
    }
  },

  deleteGalaxy: async (galaxyId: string) => {
      try {
          await api.delete(`/galaxy/management/${galaxyId}`)
          toast.success("Galáxia removida.")
          get().initializeUniverse()
      } catch (e) {
          toast.error("Erro ao apagar galáxia")
      }
  },

  centralizeNode: (note: Note | null) => {
    const { allNotes } = get()
    if (!note) {
        get().initializeUniverse()
        return
    }
    const neighbors = getNearestNotes(note, allNotes, 10)
    const neighborIds = new Set(neighbors.map(n => n.id))

    const newNotes = allNotes.map(n => {
        if (n.id === note.id) return { ...n, opacity: 1, z: 3 }
        if (neighborIds.has(n.id)) {
            const targetX = note.x + (Math.random() - 0.5) * 150
            const targetY = note.y + (Math.random() - 0.5) * 150
            return {
                ...n,
                x: n.x + (targetX - n.x) * 0.9,
                y: n.y + (targetY - n.y) * 0.9,
                z: 2, 
                opacity: 1
            }
        }
        return { ...n, opacity: 0.1 }
    })
    set({ allNotes: newNotes, tempCentralizedId: note.id })
  },

  setFocusNode: (note) => set({ focusNode: note }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleCluster: (id) => set((state) => {
    const isActive = state.activeClusterIds.includes(id)
    const newIds = isActive ? state.activeClusterIds.filter(cid => cid !== id) : [...state.activeClusterIds, id]
    return { activeClusterIds: newIds }
  }),
  setSortOrder: (order) => set({ sortOrder: order }),

  getVisibleData: () => {
    const state = get()
    let filteredNotes = state.allNotes
    filteredNotes.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      if (state.sortOrder === 'newest') return dateB - dateA
      if (state.sortOrder === 'oldest') return dateA - dateB
      return 0
    })
    return { 
        visibleNotes: filteredNotes.slice(0, state.maxVisibleNotes), 
        visibleClusters: state.clusters, 
        visibleSubClusters: state.subClusters 
    }
  }
}))