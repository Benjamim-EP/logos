import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner"
import { getNearestNotes, seededRandom } from "@/lib/math"
import { useAuthStore } from './authStore'

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

const pseudoRandom = (seed: string) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) / 4294967296);
}

interface PhysicsLink {
  galaxyId: string
  highlightId: string
  score: number
}

interface GalaxyState {
  allNotes: Note[]
  clusters: Cluster[]
  subClusters: SubCluster[]
  isLoading: boolean
  isGravityLoading: boolean
  focusNode: Note | null
  tempCentralizedId: string | null
  viewMode: ViewMode
  activeClusterIds: string[]
  sortOrder: SortOrder
  maxVisibleNotes: number

  initializeUniverse: () => Promise<void>
  createGalaxy: (name: string, x: number, y: number) => Promise<void>
  deleteGalaxy: (galaxyId: string) => Promise<void>
  
  // Helpers
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
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// --- ENGINE DE FÍSICA VETORIAL (Guest Mode) ---
// Recalcula a posição de todas as estrelas com base nas galáxias existentes
const recalculatePhysics = (notes: Note[], clusters: Cluster[]): Note[] => {
    
    // CONFIGURAÇÕES VISUAIS
    const MIN_RADIUS = 180; // Zona de exclusão (texto legível)
    const MAX_ORBIT = 1000; // Raio máximo da órbita
    const SCATTER_STRENGTH = 0.8; // Aumentado para evitar aglomerados muito densos

    return notes.map(note => {
        // 1. Sem afinidades = Caos (Fundo Estrelado)
        if (!note.affinities || Object.keys(note.affinities).length === 0) {
            const hasHome = clusters.some(c => c.id === note.clusterId);
            if (hasHome) return note; 
            
            const angle = pseudoRandom(note.id) * Math.PI * 2;
            const dist = 2500 + pseudoRandom(note.id + "dist") * 1500;
            return {
                ...note,
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                z: 0.5 + pseudoRandom(note.id + "z") * 0.5,
                clusterId: 'chaos'
            };
        }

        // 2. Identificar atrações
        let bestCluster: Cluster | null = null;
        let maxScore = -1;
        
        let pullVectorX = 0;
        let pullVectorY = 0;
        let totalPullWeight = 0;

        for (const cluster of clusters) {
            const rawScore = note.affinities?.[cluster.id] || 0;
            if (rawScore <= 0) continue;

            if (rawScore > maxScore) {
                maxScore = rawScore;
                bestCluster = cluster;
            }

            // Peso exponencial: Score alto puxa MUITO mais forte que score baixo
            // Isso evita que uma afinidade de 0.1 arraste a estrela para muito longe do pai
            const weight = Math.pow(rawScore, 3); 
            
            pullVectorX += cluster.x * weight;
            pullVectorY += cluster.y * weight;
            totalPullWeight += weight;
        }

        if (!bestCluster) return note;

        // 3. CÁLCULO DO CENTRO DE ORBITA
        // Se a estrela é puxada por várias, o centro dela se desloca.
        // Se for puxada só por uma, o centro é a própria galáxia.
        let centerX = bestCluster.x;
        let centerY = bestCluster.y;

        if (totalPullWeight > 0) {
            centerX = pullVectorX / totalPullWeight;
            centerY = pullVectorY / totalPullWeight;
        }

        // 4. DISTRIBUIÇÃO ORBITAL (A CORREÇÃO)
        // Sempre usamos um ângulo aleatório fixo baseado no ID da nota.
        // Isso garante que elas formem um círculo/nuvem ao redor do 'centerX', e não uma linha.
        const angle = pseudoRandom(note.id + "angle") * Math.PI * 2;

        // 5. CÁLCULO DO RAIO (Distância do Centro)
        const similarityGap = 1 - maxScore; // 0.0 (Idêntico) a 1.0 (Diferente)
        const jitter = (pseudoRandom(note.id + "jitter") - 0.5) * 200; // Variação aleatória
        
        // Fórmula: Raio Mínimo + (Distância baseada na relevância) + Ruído
        const radius = MIN_RADIUS + (similarityGap * MAX_ORBIT) + (jitter * SCATTER_STRENGTH);

        return {
            ...note,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            // Z-Index (Escala): Notas mais relevantes ficam maiores
            z: 0.8 + (maxScore * 1.5), 
            clusterId: bestCluster.id
        };
    });
};


const getInitialTerm = (lang: string) => {
    if (lang === 'pl') return 'Bóg';
    if (lang === 'pt') return 'Deus';
    return 'God';
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

    const { isGuest, guestUniverse } = useAuthStore.getState()
    set({ isLoading: true, tempCentralizedId: null })

    // =================================================================
    // 🛸 MODO VISITANTE
    // =================================================================
     if (isGuest) {
        let finalNotes: Note[] = [];
        let finalClusters: Cluster[] = [];
        let activeIds: string[] = ["chaos"]; // Começa apenas com o Caos ativo

        // 1. UNIVERSO PÚBLICO (BÍBLIA OU OUTRO)
        if (guestUniverse?.id && guestUniverse.id !== 'empty') {
            try {
                const { data } = await api.get(`/ai/galaxy/tour/${guestUniverse.pineconeFilter}/${guestUniverse.lang}`)
                
                // REMOVIDO: const bibleClusterId = "bible-core";
                
                const tourNotes: Note[] = data.map((item: any, i: number) => {
                    // ALTERADO: Em vez de espiral organizada, usamos dispersão aleatória (Caos)
                    // Usamos pseudoRandom para manter a consistência visual se recarregar
                    const seed = item.highlightId || String(i);
                    const angle = pseudoRandom(seed) * Math.PI * 2;
                    // Distância variada entre 800 e 3500 para espalhar bem na tela
                    const radius = 800 + pseudoRandom(seed + "dist") * 2700; 

                    return {
                        id: item.highlightId,
                        title: item.text ? item.text.substring(0, 40) + "..." : "Versículo",
                        preview: item.text, 
                        tags: ["Sagradas Escrituras"],
                        createdAt: new Date().toISOString(),
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius,
                        z: 1,
                        clusterId: 'chaos', // <--- IMPORTANTE: Nascem no Caos
                        affinities: {}      // <--- IMPORTANTE: Sem gravidade inicial
                    }
                })

                finalNotes = [...finalNotes, ...tourNotes];
                
                // REMOVIDO: Não adicionamos o cluster da bíblia em finalClusters
                // O usuário verá apenas estrelas dispersas

            } catch (err) {
                console.error("Erro tour", err)
                set({ isLoading: false })
            }
        }

        // 2. DADOS PESSOAIS (GUEST STARS - Se houver upload)
        try {
            const { data: guestData } = await api.get('/ai/galaxy/guest-stars');
            if (guestData && guestData.length > 0) {
                // Mantemos "Meus Dados" como um cluster se quiser, 
                // ou jogamos no caos também. Vamos jogar no caos para consistência.
                const personalNotes: Note[] = guestData.map((item: any, i: number) => {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 500 + Math.random() * 1000;
                    
                    return {
                        id: item.highlightId,
                        title: "Meu Arquivo",
                        preview: item.text,
                        tags: ["Pessoal", "Guest"],
                        createdAt: new Date().toISOString(),
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius,
                        z: 2,
                        clusterId: 'chaos', // Caos
                        documentId: "sample-book",
                        affinities: {} // Sem afinidade
                    }
                });
                
                finalNotes = [...finalNotes, ...personalNotes];
            }
        } catch (e) {}

        // Atualiza o estado
        set({ 
            allNotes: finalNotes,
            clusters: finalClusters, // Lista vazia inicialmente
            subClusters: [],
            activeClusterIds: activeIds,
            isLoading: false 
        })
        return;
    }
    
    // =================================================================
    // 👤 MODO USUÁRIO REAL
    // =================================================================
    try {
        const [starsRes, stateRes] = await Promise.all([
            api.get('/galaxy/stars'),
            api.get('/galaxy/management/state')
        ])
        
        const stars = starsRes.data
        const { galaxies, links } = stateRes.data

        const clusters: Cluster[] = galaxies.map((g: any) => ({
            id: String(g.id), label: g.name, color: g.color || '#ffffff', x: g.x || 0, y: g.y || 0, isActive: g.isActive
        }))

        let notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             let parsedPosition = null;
             try { if (star.positionJson) parsedPosition = JSON.parse(star.positionJson); } catch (e) { }

             // Reconstrói mapa de afinidades
             const affinities: Record<string, number> = {};
             const myLinks = links.filter((l:any) => l.highlightId === starId);
             
             myLinks.forEach((l: any) => {
                 affinities[l.galaxyId] = l.score;
             });

             return {
                id: starId,
                title: star.documentTitle || "Nota",
                preview: star.content || "",
                tags: [star.type],
                createdAt: star.createdAt,
                x: 0, y: 0, z: 1, // Será calculado
                clusterId: "chaos", // Será calculado
                documentId: star.documentId,
                position: parsedPosition,
                affinities 
             }
        })

        // Aplica física no load do usuário também
        notes = recalculatePhysics(notes, clusters);

        set({ allNotes: notes, clusters, activeClusterIds: [...clusters.map(c => c.id), "chaos"], isLoading: false })
    } catch (error) {
        console.error(error)
        set({ isLoading: false })
    }
  },

  createGalaxy: async (name: string, x: number, y: number) => {
    if (!name.trim()) return
    set({ isGravityLoading: true })
    
    const { isGuest, guestUniverse } = useAuthStore.getState()

    // --- GUEST CREATE ---
    if (isGuest) {
        const newGalaxyId = `guest-galaxy-${Date.now()}`;
        
        // 1. Cria a nova Galáxia
        const newCluster: Cluster = {
            id: newGalaxyId,
            label: name,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), 
            x, y, isActive: true
        }

        try {
            // 2. Busca afinidades na IA
            const { data } = await api.post('/ai/galaxy/tour/gravity', {
                term: name,
                universe: guestUniverse?.pineconeFilter || 'bible',
                lang: guestUniverse?.lang || 'en'
            })

            const matches = data.matches; 
            
            // 3. Atualiza as Afinidades nas Notas
            let currentNotes = get().allNotes;
            const newScores = new Map(matches.map((m: any) => [m.highlightId, m.score]));

            currentNotes = currentNotes.map(note => {
                const score = newScores.get(note.id);
                if (score) {
                    return {
                        ...note,
                        affinities: {
                            ...note.affinities,
                            [newGalaxyId]: Number(score)
                        }
                    }
                }
                return note;
            });

            // 4. RODA A FÍSICA GLOBAL V2
            // Ao passar a nova lista de clusters, o recalculatePhysics vai ver o novo vetor de atração
            // e reposicionar apenas as notas que têm afinidade com a nova galáxia.
            const allClusters = [...get().clusters, newCluster];
            const rebalancedNotes = recalculatePhysics(currentNotes, allClusters);

            set({ 
                clusters: allClusters,
                allNotes: rebalancedNotes,
                activeClusterIds: [...get().activeClusterIds, newGalaxyId],
                isGravityLoading: false 
            })
            
            if (matches.length > 0) toast.success(`${matches.length} estrelas reagiram!`)
            else toast.info(`Galáxia criada (sem atrações).`)

        } catch (e) {
            console.error(e)
            set({ isGravityLoading: false })
        }
        return;
    }
    
    // --- USER REAL ---
    try {
        await api.post('/galaxy/management', { name, color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), x, y })
        toast.success(`Galáxia "${name}" criada!`)
        // O initializeUniverse já chama o recalculatePhysics
        get().initializeUniverse()
    } catch (e: any) {
        const msg = e.response?.data?.message || "Falha ao criar galáxia";
        toast.error(msg);
    } finally {
        set({ isGravityLoading: false })
    }
  },

  deleteGalaxy: async (galaxyId: string) => {
      const { isGuest } = useAuthStore.getState();

      if (isGuest) {
          set(state => {
              const remainingClusters = state.clusters.filter(c => c.id !== galaxyId);
              
              // Ao remover, rodamos a física. As notas que orbitavam essa galáxia 
              // vão procurar seu "segundo melhor pai" ou cair no caos.
              const rebalancedNotes = recalculatePhysics(state.allNotes, remainingClusters);

              toast.success("Galáxia visitante removida.");
              
              return { 
                  clusters: remainingClusters, 
                  allNotes: rebalancedNotes,
                  activeClusterIds: state.activeClusterIds.filter(id => id !== galaxyId)
              };
          })
          return;
      }

      try {
          await api.delete(`/galaxy/management/${galaxyId}`)
          toast.success("Galáxia removida.")
          get().initializeUniverse()
      } catch (e) {
          toast.error("Erro ao apagar galáxia")
      }
  },

  centralizeNode: (note: Note | null) => {
    // Mantive a lógica de centralização visual temporária, pois é um efeito de UI
    const { allNotes } = get()
    if (!note) {
        // Ao sair do foco, voltamos para a posição física real calculada anteriormente
        // Como não salvamos o estado "pré-zoom", o ideal é re-renderizar o estado atual.
        // O Zustand mantém o estado, então apenas limpamos o foco.
        set({ tempCentralizedId: null, focusNode: null })
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
                x: n.x + (targetX - n.x) * 0.9, // Move visualmente para perto
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
    return { activeClusterIds: isActive ? state.activeClusterIds.filter(cid => cid !== id) : [...state.activeClusterIds, id] }
  }),
  setSortOrder: (order) => set({ sortOrder: order }),
  getVisibleData: () => {
    const state = get()
    return { 
        visibleNotes: state.allNotes, 
        visibleClusters: state.clusters, 
        visibleSubClusters: state.subClusters 
    }
  }
}))