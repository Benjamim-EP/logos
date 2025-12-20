import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Star, MoreVertical, FileText, Loader2, BookX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import type { Note } from "@/types/galaxy"

// Importação da Integração Real
import { useLibraryBooks } from "@/features/library/hooks/useLibrary"

// Função auxiliar para gerar capas bonitas baseadas no ID (para não ficar tudo igual)
const getCoverImage = (id: string) => {
  const seeds = ["technology", "universe", "abstract", "geometry", "network"]
  // Usa o último caractere do ID para escolher um tema
  const seed = seeds[id.charCodeAt(id.length - 1) % seeds.length]
  return `https://source.unsplash.com/random/400x600?${seed}`
}

export function BookShelf() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  const [readingBook, setReadingBook] = useState<any>(null)

  // --- HOOK REAL (Busca no Backend) ---
  const { data: books, isLoading, isError } = useLibraryBooks()

  // Adaptador: Transforma o JSON do Backend no formato visual do Componente
  // O backend retorna: { id, title, preview, highlightsCount, lastRead }
  const handleOpenBook = (book: any) => {
    const noteAdapter: Note = {
      id: book.id,
      title: book.title,
      preview: book.preview,
      tags: ["Importado", "PDF"], // Tags padrão por enquanto
      createdAt: book.lastRead || new Date().toISOString(),
      x: 0, y: 0, z: 1, clusterId: "library"
    }
    // Usamos o sample.pdf por enquanto para garantir que abra, 
    // mas o título e ID são do documento real do banco.
    setReadingBook({ note: noteAdapter, url: "/sample.pdf" })
  }

  if (readingBook) {
    return (
      <PdfReaderView 
        note={readingBook.note}
        pdfUrl={readingBook.url}
        onClose={() => setReadingBook(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-10 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            Biblioteca Digital
          </h1>
          <p className="text-gray-400">Gerencie seus livros, artigos e documentos.</p>
        </div>
        <Button 
            variant="outline" 
            onClick={() => setViewMode('galaxy')}
            className="border-white/20 hover:bg-white/10"
        >
            Voltar para Galáxia
        </Button>
      </div>

      {/* --- ESTADOS DE CARREGAMENTO (UX) --- */}
      
      {isLoading && (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p>Sincronizando com o Núcleo...</p>
        </div>
      )}

      {isError && (
        <div className="h-64 flex flex-col items-center justify-center text-red-400 gap-4">
            <BookX className="w-10 h-10" />
            <p>Erro ao carregar biblioteca. Verifique sua conexão com o Gateway.</p>
        </div>
      )}

      {/* --- GRID DE LIVROS (DADOS REAIS) --- */}
      
      {!isLoading && !isError && books?.length === 0 && (
        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
            <p>Sua biblioteca está vazia.</p>
            <p className="text-sm mt-2">Faça upload de um PDF na tela de Pesquisa ou via API.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {books?.map((book: any, i: number) => {
            // Gera uma capa determinística baseada no ID (sempre a mesma capa para o mesmo livro)
            // Usamos picsum porque o source.unsplash foi descontinuado recentemente
            const coverUrl = `https://picsum.photos/seed/${book.id}/400/600`
            
            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col gap-3"
              >
                {/* Capa */}
                <div 
                    className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-gray-800"
                    onClick={() => handleOpenBook(book)}
                >
                    <img 
                        src={coverUrl} 
                        alt={book.title} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                    />
                    
                    {/* Overlay de Progresso (Fake por enquanto) */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: '42%' }} />
                    </div>

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/20 p-3 rounded-full border border-white/30 backdrop-blur-md">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* Metadados */}
                <div className="space-y-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg leading-tight truncate pr-2 group-hover:text-blue-400 transition-colors" title={book.title}>
                            {book.title}
                        </h3>
                        <button className="text-gray-500 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                    <p className="text-sm text-gray-400 truncate">IA Processed • {book.highlightsCount} anotações</p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(book.lastRead || Date.now()).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500/50" /> 42%</span>
                    </div>
                </div>
              </motion.div>
            )
        })}
      </div>
    </div>
  )
}