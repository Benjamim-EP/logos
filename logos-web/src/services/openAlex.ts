// Tipagem básica do retorno do OpenAlex
export interface Paper {
  id: string
  title: string
  publication_year: number
  cited_by_count: number
  abstract_inverted_index?: Record<string, number[]>
  open_access: {
    is_oa: boolean
    oa_url?: string
  }
  primary_location?: {
    source?: {
      display_name?: string
    }
  }
}

// Reconstrói o texto a partir do índice invertido (Lógica de Algoritmos)
function reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
  if (!invertedIndex) return "Resumo não disponível."

  const words: string[] = []
  
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    positions.forEach(pos => {
      words[pos] = word
    })
  })

  return words.join(" ")
}

export async function searchPapers(query: string, field?: string) {
  // Construção da Query
  let searchQuery = query
  if (field && field !== 'all') {
    searchQuery += ` ${field}`
  }

  const params = new URLSearchParams({
    search: searchQuery,
    per_page: '15',
    filter: 'has_fulltext:true',
    sort: 'publication_date:desc' // <--- TRAZ OS MAIS RECENTES
  })

  try {
    const response = await fetch(`https://api.openalex.org/works?${params}`)
    const data = await response.json()
    
    // Tratamento de dados (Adapter Pattern)
    return data.results.map((paper: Paper) => ({
      id: paper.id,
      title: paper.title || "Sem título",
      year: paper.publication_year,
      citations: paper.cited_by_count,
      venue: paper.primary_location?.source?.display_name || "Desconhecido",
      abstract: reconstructAbstract(paper.abstract_inverted_index),
      pdfUrl: paper.open_access.oa_url,
      // Simula um tamanho de arquivo entre 1MB e 5MB para o nosso controle de storage
      sizeMB: Math.floor(Math.random() * 4) + 1 
    }))
  } catch (error) {
    console.error("Erro na busca OpenAlex:", error)
    return []
  }
}