import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Star, MoreVertical, FileText, Loader2, BookX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import type { Note } from "@/types/galaxy"
import { useLibraryBooks } from "@/features/library/hooks/useLibrary"
import api from "@/lib/api"
import { toast } from "sonner"

export function BookShelf() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  
  // Estado local: Guarda qual livro está sendo lido e a URL assinada temporária
  const [readingBook, setReadingBook] = useState<{ note: Note, url: string } | null>(null)

  // Hook que busca a lista de livros do backend
  const { data: books, isLoading, isError } = useLibraryBooks()

  // --- AÇÃO: ABRIR LIVRO REAL ---
  const handleOpenBook = async (book: any) => {
    try {
        // Feedback visual
        toast.loading("Solicitando acesso ao documento...", { id: "open-book" })

        // 1. Pede a URL assinada ao Backend (Library Service)
        // Isso garante que o link do Google Cloud seja válido e seguro
        const { data } = await api.get(`/library/books/${book.id}/content`)
        
        // 2. Prepara o objeto Note para o leitor (Adapter)
        const noteAdapter: Note = {
          id: book.id,
          title: book.title,
          preview: book.preview,
          tags: ["PDF", "Biblioteca"],
          createdAt: book.lastRead || new Date().toISOString(),
          x: 0, y: 0, z: 1, 
          clusterId: "library"
        }
        
        // 3. Abre o modal de leitura com a URL real
        setReadingBook({ note: noteAdapter, url: data.url })
        
        toast.dismiss("open-book")

    } catch (error) {
        console.error("Erro ao abrir livro:", error)
        toast.dismiss("open-book")
        toast.error("Não foi possível abrir o livro.", {
            description: "O arquivo pode não estar disponível no armazenamento."
        })
    }
  }

  // Se estiver lendo, mostra o Leitor em tela cheia sobreposto
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

      {/* --- ESTADOS DE CARREGAMENTO --- */}
      
      {isLoading && (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p>Sincronizando biblioteca...</p>
        </div>
      )}

      {isError && (
        <div className="h-64 flex flex-col items-center justify-center text-red-400 gap-4">
            <BookX className="w-10 h-10" />
            <p>Erro de conexão com a Biblioteca.</p>
        </div>
      )}

      {/* --- GRID DE LIVROS --- */}
      
      {!isLoading && !isError && books?.length === 0 && (
        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
            <p>Sua biblioteca está vazia.</p>
            <p className="text-sm mt-2">Use a Pesquisa para salvar artigos ou faça upload de PDFs.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {books?.map((book: any, i: number) => {
            // Lógica da Capa: Se tiver URL real (Fase de Capas), usa. Senão, placeholder.
            const coverUrl = book.coverUrl && book.coverUrl !== "" 
                ? book.coverUrl 
                : `https://picsum.photos/seed/${book.id}/400/600`;

            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col gap-3"
              >
                {/* CARD / CAPA */}
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
                    
                    {/* Barra de Progresso Fake (Visual) */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: '0%' }} />
                    </div>

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/20 p-3 rounded-full border border-white/30 backdrop-blur-md">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* INFO DO LIVRO */}
                <div className="space-y-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg leading-tight truncate pr-2 group-hover:text-blue-400 transition-colors" title={book.title}>
                            {book.title}
                        </h3>
                        <button className="text-gray-500 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                        {book.highlightsCount > 0 ? `${book.highlightsCount} anotações` : "Sem anotações"}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 
                            {new Date(book.lastRead || Date.now()).toLocaleDateString()}
                        </span>
                    </div>
                </div>
              </motion.div>
            )
        })}
      </div>
    </div>
  )
}