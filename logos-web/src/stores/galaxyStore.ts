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
  createGalaxy: (name: string) => Promise<void> // Store calcula x,y
  deleteGalaxy: (galaxyId: string) => Promise<void>
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

// --- FUNÇÃO AUXILIAR: Encontrar espaço vazio no universo ---
// Evita que novas galáxias nasçam sobrepostas
function findEmptySpace(clusters: Cluster[], minDistance: number = 800): { x: number, y: number } {
    let bestX = 0;
    let bestY = 0;
    let maxDist = 0;
    
    // Se for a primeira, nasce no centro
    if (clusters.length === 0) return { x: 0, y: 0 };

    // Tenta 30 posições aleatórias e escolhe a mais distante das outras
    for (let i = 0; i < 30; i++) {
        const x = (Math.random() - 0.5) * 4000;
        const y = (Math.random() - 0.5) * 4000;
        
        let minDistToOthers = 999999;
        
        for (const c of clusters) {
            const dist = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
            if (dist < minDistToOthers) minDistToOthers = dist;
        }

        // Se achou um lugar com a distância mínima segura, usa ele imediatamente
        if (minDistToOthers > minDistance) {
            return { x, y };
        }

        // Se não, guarda o "menos pior" (o mais longe possível)
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
  maxVisibleNotes: 800, // Limite seguro para WebGL/DOM

  /**
   * INICIALIZAÇÃO: Carrega Estrelas, Galáxias e Links, e aplica a Física.
   */
  initializeUniverse: async () => {
    // Evita recarregar se já está carregando
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

        console.log(`📡 Telemetria: ${stars.length} estrelas, ${galaxies.length} galáxias, ${links.length} conexões.`)

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

        // 4. MOTOR FÍSICO (Cálculo de Posição Determinístico)
        const notes: Note[] = stars.map((star: any) => {
             const starId = String(star.id)
             const myLinks = linkMap.get(starId)

             // A. Parse seguro do JSON de posição (Para Deep Linking no PDF)
             let parsedPosition = null;
             try {
                if (star.positionJson) {
                    parsedPosition = JSON.parse(star.positionJson);
                }
             } catch (e) {
                // Ignora erros de parse
             }

             // Variáveis finais
             let x = 0;
             let y = 0;
             let tags = [star.type];
             let clusterId = "chaos";

             // B. LÓGICA DE POSICIONAMENTO
             
             if (myLinks && myLinks.length > 0) {
                 // --- CENÁRIO 1: ORGANIZADO (Tem Gravidade) ---
                 
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
                     // 1. Centro de Gravidade (Baricentro)
                     const centerX = vectorX / totalScore;
                     const centerY = vectorY / totalScore;

                     // 2. NOVA FÍSICA: "Orbiting" em vez de "Clumping"
                     // Queremos que elas fiquem próximas, mas não em cima do texto.
                     
                     // Definimos um raio de "exclusão" (tamanho do texto da galáxia)
                     const innerSafeZone = 200; 
                     
                     // Quanto maior o score, mais perto da zona de exclusão ela fica.
                     // Se score é 0.9 -> ela fica quase colada no raio 200.
                     // Se score é 0.3 -> ela fica lá pro raio 800.
                     const scoreEffect = (1 - Math.min(totalScore, 0.95)) * 800;
                     
                     const dispersionRadius = innerSafeZone + scoreEffect;
                     
                     // 3. Ângulo Determinístico
                     const stableAngle = seededRandom(starId + "disp", 0, Math.PI * 2);

                     // 4. Jitter (Pequeno desvio aleatório para não formar um círculo perfeito)
                     const jitter = seededRandom(starId + "jitter", -50, 50);

                     x = centerX + (Math.cos(stableAngle) * (dispersionRadius + jitter));
                     y = centerY + (Math.sin(stableAngle) * (dispersionRadius + jitter));
                     
                     tags = [...new Set([...tags, ...activeTags])];
                     clusterId = "organized"; 
                 }
             } else {
                 // --- CENÁRIO 2: CAOS (Sem Gravidade) ---
                 // Usa seededRandom para posição fixa no caos (não muda no F5)
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

        // 5. Atualiza Store
        set({ 
            allNotes: notes, 
            clusters: clusters,
            subClusters: [],
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
   * CRIAÇÃO DE GALÁXIA COM POSICIONAMENTO INTELIGENTE
   */
  createGalaxy: async (name: string) => {
    if (!name.trim()) return

    set({ isGravityLoading: true })

    try {
        // 1. Encontra um lugar vazio no espaço
        const currentClusters = get().clusters;
        const pos = findEmptySpace(currentClusters, 1000);

        console.log(`💾 Criando galáxia "${name}" em (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)})`)
        
        // 2. Salva no Backend
        await api.post('/galaxy/management', {
            name,
            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16),
            x: pos.x,
            y: pos.y
        })
        
        toast.success(`Galáxia "${name}" criada!`)

        // 3. Recarrega para aplicar gravidade com os novos links
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
   * DELETAR GALÁXIA E LIBERAR ESTRELAS
   */
  deleteGalaxy: async (galaxyId: string) => {
      try {
          // 1. Delete no Backend
          await api.delete(`/galaxy/management/${galaxyId}`)
          toast.success("Galáxia removida. As estrelas foram liberadas.")
          
          // 2. Recarrega o universo (As estrelas perderão os links e voltarão ao Caos)
          get().initializeUniverse()
      } catch (e) {
          console.error("Erro ao apagar", e)
          toast.error("Erro ao apagar galáxia")
      }
  },

  /**
   * CENTRALIZAR NÓ (GRAVIDADE TEMPORÁRIA / LENSING)
   */
  centralizeNode: (note: Note | null) => {
    const { allNotes } = get()
    
    // Reset se nulo
    if (!note) {
        get().initializeUniverse()
        return
    }

    // 1. Encontra vizinhos (Top 10 mais próximos matematicamente via Vetores ou Posição)
    // Nota: Como não temos vetores no front, usamos a posição atual como proxy de similaridade
    const neighbors = getNearestNotes(note, allNotes, 10)
    const neighborIds = new Set(neighbors.map(n => n.id))

    // 2. Aplica transformação nas posições visualmente
    const newNotes = allNotes.map(n => {
        // A nota central fica fixa e em destaque
        if (n.id === note.id) return { ...n, opacity: 1, z: 3 }
        
        if (neighborIds.has(n.id)) {
            // LERP: Traz o vizinho 85% do caminho em direção ao centro
            const targetX = note.x + (Math.random() - 0.5) * 150 // Jitter para não sobrepor
            const targetY = note.y + (Math.random() - 0.5) * 150
            
            return {
                ...n,
                x: n.x + (targetX - n.x) * 0.85,
                y: n.y + (targetY - n.y) * 0.85,
                z: 2, 
                opacity: 1
            }
        }
        
        // Diminui a opacidade do resto do universo
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

    // Ordenação Z-Index
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