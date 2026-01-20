import { create } from 'zustand'
import type { Cluster, Note, SubCluster } from '@/types/galaxy'
import api from "@/lib/api"
import { toast } from "sonner"
import { getNearestNotes, seededRandom } from "@/lib/math"
import { useAuthStore } from './authStore'

export type ViewMode = 'galaxy' | 'shelf' | 'profile'
export type SortOrder = 'newest' | 'oldest' | 'relevance'

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
    return notes.map(note => {
        // Se a nota não tem afinidades conhecidas, mantém onde está ou vai pro caos
        if (!note.affinities || Object.keys(note.affinities).length === 0) {
            // Verifica se a galáxia "mãe" atual ainda existe
            const stillHasHome = clusters.some(c => c.id === note.clusterId);
            if (stillHasHome) return note;
            
            // Se perdeu a casa, vira poeira estelar (Caos)
            return { ...note, clusterId: "chaos", z: 1, x: note.x * 1.1, y: note.y * 1.1 };
        }

        let totalX = 0;
        let totalY = 0;
        let totalWeight = 0;
        
        let strongestClusterId = "chaos";
        let maxScore = 0;

        // Somatório Vetorial Ponderado
        clusters.forEach(cluster => {
            const score = note.affinities?.[cluster.id] || 0;
            
            // Threshold mínimo para atração (evita ruído)
            if (score > 0.4) {
                // A posição da galáxia atrai a nota com força proporcional ao score
                totalX += cluster.x * score;
                totalY += cluster.y * score;
                totalWeight += score;

                // Define a "cor" da nota baseada na atração mais forte
                if (score > maxScore) {
                    maxScore = score;
                    strongestClusterId = cluster.id;
                }
            }
        });

        // Se a nota ficou órfã (nenhuma galáxia restante tem afinidade forte)
        if (totalWeight === 0) {
            return { 
                ...note, 
                clusterId: "chaos", 
                z: 1, 
                // Espalha um pouco para não ficarem empilhadas
                x: (Math.random() - 0.5) * 4000, 
                y: (Math.random() - 0.5) * 4000 
            };
        }

        // Centro de Gravidade (Média Ponderada)
        const centerX = totalX / totalWeight;
        const centerY = totalY / totalWeight;

        // Dispersão Natural
        // Notas com muitos "pais" (totalWeight alto) ficam mais presas ao centro
        // Notas com pouca afinidade ficam mais soltas (nuvem)
        const tightness = Math.max(50, 400 - (totalWeight * 80)); 
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * tightness;

        return {
            ...note,
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            clusterId: strongestClusterId, 
            z: 1 + Math.min(totalWeight, 3) // Cresce se for popular
        };
    });
};

// Helper para tradução inicial
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
        let activeIds: string[] = [];

        // 1. UNIVERSO PÚBLICO (BÍBLIA)
        if (guestUniverse?.id && guestUniverse.id !== 'empty') {
            try {
                const { data } = await api.get(`/ai/galaxy/tour/${guestUniverse.pineconeFilter}/${guestUniverse.lang}`)
                
                const bibleClusterId = "bible-core";
                
                const tourNotes: Note[] = data.map((item: any, i: number) => {
                    // Inicialização em Espiral (Estética inicial)
                    const angle = i * GOLDEN_ANGLE;
                    const radius = 60 * Math.sqrt(i); 

                    return {
                        id: item.highlightId,
                        title: item.text ? item.text.substring(0, 40) + "..." : "Versículo",
                        preview: item.text, 
                        tags: ["Sagradas Escrituras"],
                        createdAt: new Date().toISOString(),
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius,
                        z: 1,
                        clusterId: bibleClusterId,
                        // Define afinidade inicial forte com o núcleo
                        affinities: { [bibleClusterId]: 1.0 } 
                    }
                })

                finalNotes = [...finalNotes, ...tourNotes];
                
                // Define label baseado no idioma
                const label = getInitialTerm(guestUniverse.lang) + (guestUniverse.lang === 'pt' ? ' (Gênesis)' : '');

                finalClusters.push({ 
                    id: bibleClusterId, label, color: "#fbbf24", x: 0, y: 0, isActive: true 
                });
                activeIds.push(bibleClusterId);

            } catch (err) {
                console.error("Erro tour", err)
                set({ isLoading: false })
            }
        }

        // 2. DADOS PESSOAIS (GUEST STARS)
        try {
            const { data: guestData } = await api.get('/ai/galaxy/guest-stars');
            if (guestData && guestData.length > 0) {
                const myDataId = "my-data";
                
                const personalNotes: Note[] = guestData.map((item: any) => ({
                    id: item.highlightId,
                    title: "Meu Highlight",
                    preview: item.text,
                    tags: ["Pessoal", "Guest"],
                    createdAt: new Date().toISOString(),
                    x: 400 + (Math.random() - 0.5) * 200,
                    y: -400 + (Math.random() - 0.5) * 200,
                    z: 2,
                    clusterId: myDataId,
                    documentId: "sample-book",
                    affinities: { [myDataId]: 1.0 }
                }));
                
                finalNotes = [...finalNotes, ...personalNotes];
                finalClusters.push({ id: myDataId, label: "Meus Dados", color: "#ec4899", x: 400, y: -400, isActive: true });
                activeIds.push(myDataId);
            }
        } catch (e) {}

        set({ 
            allNotes: finalNotes,
            clusters: finalClusters,
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
        console.log("🌌 Carregando Universo Real...")
        const [starsRes, stateRes] = await Promise.all([
            api.get('/galaxy/stars'),
            api.get('/galaxy/management/state')
        ])
        
        const stars = starsRes.data
        const { galaxies, links } = stateRes.data

        const clusters: Cluster[] = galaxies.map((g: any) => ({
            id: String(g.id), label: g.name, color: g.color || '#ffffff', x: g.x || 0, y: g.y || 0, isActive: g.isActive
        }))

        // Recria afinidades baseadas no banco relacional
        const notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             let parsedPosition = null;
             try { if (star.positionJson) parsedPosition = JSON.parse(star.positionJson); } catch (e) { }

             // Calcula afinidades
             const affinities: Record<string, number> = {};
             const myLinks = links.filter((l:any) => l.highlightId === starId);
             
             myLinks.forEach((l: any) => {
                 affinities[l.galaxyId] = l.score;
             });

             // Posição inicial (Será sobrescrita pelo recalculatePhysics se usarmos, mas mantemos a lógica legacy de inicialização)
             // (Para manter compatibilidade com seu código antigo, vou manter a lógica de inicialização original aqui,
             // mas você poderia usar o recalculatePhysics aqui também se quisesse unificar)
             let x = 0; let y = 0; let clusterId = "chaos";
             
             if (myLinks.length > 0) {
                 let vectorX = 0; let vectorY = 0; let totalScore = 0;
                 let bestScore = 0;
                 
                 myLinks.forEach((link: any) => {
                     const galaxy = clusters.find(c => c.id === link.galaxyId)
                     if (galaxy) {
                         vectorX += galaxy.x * link.score;
                         vectorY += galaxy.y * link.score;
                         totalScore += link.score;
                         if(link.score > bestScore) {
                             bestScore = link.score;
                             clusterId = galaxy.id;
                         }
                     }
                 })
                 
                 if (totalScore > 0) {
                     const centerX = vectorX / totalScore;
                     const centerY = vectorY / totalScore;
                     const dispersion = 200 + (1 - Math.min(totalScore, 0.95)) * 600;
                     const angle = seededRandom(starId, 0, Math.PI * 2);
                     x = centerX + (Math.cos(angle) * dispersion);
                     y = centerY + (Math.sin(angle) * dispersion);
                 }
             } else {
                 const angle = seededRandom(starId, 0, Math.PI * 2);
                 const r = seededRandom(starId + "r", 2500, 4500); 
                 x = r * Math.cos(angle); y = r * Math.sin(angle);
             }

             return {
                id: starId,
                title: star.documentTitle || "Nota",
                preview: star.content || "",
                tags: [star.type],
                createdAt: star.createdAt,
                x, y, z: 1,
                clusterId,
                documentId: star.documentId,
                position: parsedPosition,
                affinities // Importante estar aqui
             }
        })

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
            console.log(`🧲 IA encontrou ${matches.length} conexões para "${name}".`);
            
            // 3. Atualiza as Afinidades nas Notas
            let currentNotes = get().allNotes;
            
            const newScores = new Map(matches.map((m: any) => [m.highlightId, m.score]));

            currentNotes = currentNotes.map(note => {
                const score = newScores.get(note.id);
                if (score) {
                    // Adiciona a nova afinidade ao dicionário existente
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

            // 4. RODA A FÍSICA GLOBAL
            // O segredo: Passamos a lista ATUALIZADA de clusters (com a nova)
            const allClusters = [...get().clusters, newCluster];
            const rebalancedNotes = recalculatePhysics(currentNotes, allClusters);

            set({ 
                clusters: allClusters,
                allNotes: rebalancedNotes,
                activeClusterIds: [...get().activeClusterIds, newGalaxyId],
                isGravityLoading: false 
            })
            
            if (matches.length > 0) toast.success(`${matches.length} atraídos!`)
            else toast.info(`Tema criado.`)

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

      // --- GUEST DELETE ---
      if (isGuest) {
          set(state => {
              // 1. Remove a Galáxia da lista
              const remainingClusters = state.clusters.filter(c => c.id !== galaxyId);
              
              // 2. Roda a Física novamente nas notas
              // As notas ainda têm a afinidade no objeto 'affinities', mas como o cluster 
              // não está mais na lista 'remainingClusters', a função 'recalculatePhysics' 
              // vai ignorar essa afinidade e redistribuir a nota para a próxima melhor galáxia (ou caos).
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

      // --- USER DELETE ---
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