import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner"
import { getNearestNotes, seededRandom } from "@/lib/math"

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

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
  tempCentralizedId: string | null
  viewMode: ViewMode
  
  // --- FILTROS ---
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  // --- ACTIONS ---
  initializeUniverse: () => Promise<void>
  
  // CORREÇÃO AQUI: A assinatura agora aceita 3 argumentos
  createGalaxy: (name: string, x: number, y: number) => Promise<void>
  
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

        const clusters: Cluster[] = galaxies.map((g: any) => ({
            id: String(g.id),
            label: g.name,
            color: g.color || '#ffffff',
            x: g.x || 0,
            y: g.y || 0,
            isActive: g.isActive
        }))

        const linkMap = new Map<string, PhysicsLink[]>()
        links.forEach((l: any) => {
            if (!linkMap.has(l.highlightId)) {
                linkMap.set(l.highlightId, [])
            }
            linkMap.get(l.highlightId)?.push(l)
        })

        const notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             const myLinks = linkMap.get(starId)

             let parsedPosition = null;
             try {
                if (star.positionJson) {
                    parsedPosition = JSON.parse(star.positionJson);
                }
             } catch (e) { }

             let tags = [star.type]; 
             let x = 0;
             let y = 0;
             let clusterId = "chaos";

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
                     const centerX = vectorX / totalScore;
                     const centerY = vectorY / totalScore;
                     const innerSafeZone = 200; 
                     const scoreEffect = (1 - Math.min(totalScore, 0.95)) * 800;
                     const dispersionRadius = innerSafeZone + scoreEffect;
                     
                     const stableAngle = seededRandom(starId + "disp", 0, Math.PI * 2);
                     const jitter = seededRandom(starId + "jitter", -50, 50);

                     x = centerX + (Math.cos(stableAngle) * (dispersionRadius + jitter));
                     y = centerY + (Math.sin(stableAngle) * (dispersionRadius + jitter));
                     
                     tags = [...new Set([...tags, ...activeTags])];
                     clusterId = "organized"; 
                 }
             } else {
                 const stableAngle = seededRandom(starId + "ang", 0, Math.PI * 2);
                 const stableRadius = seededRandom(starId + "rad", 2500, 4500); 
                 x = stableRadius * Math.cos(stableAngle);
                 y = stableRadius * Math.sin(stableAngle);
             }

             return {
                id: starId,
                title: star.documentTitle || "Documento Sem Título",
                preview: star.content || "",
                tags: tags,
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

  // --- CORREÇÃO AQUI NA IMPLEMENTAÇÃO ---
  createGalaxy: async (name: string, x: number, y: number) => {
    if (!name.trim()) return
    set({ isGravityLoading: true })
    
    try {
        // Agora usamos o X e Y passados pelo componente (que já calculou uma posição aleatória)
        await api.post('/galaxy/management', {
            name,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16),
            x: x, 
            y: y
        })
        
        toast.success(`Galáxia "${name}" criada!`)
        get().initializeUniverse()
        
    } catch (e: any) {
        // Tratamento de erro melhorado
        const msg = e.response?.data?.message || "Falha ao criar galáxia";
        toast.error(msg);
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