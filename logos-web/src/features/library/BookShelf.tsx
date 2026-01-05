import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Star, MoreVertical, FileText, Loader2, BookX, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import type { Note } from "@/types/galaxy"
import { useLibraryBooks } from "@/features/library/hooks/useLibrary"
import api from "@/lib/api"
import { toast } from "sonner"

export function BookShelf() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  const [readingBook, setReadingBook] = useState<{ note: Note, url: string } | null>(null)

  const { data: books, isLoading, isError } = useLibraryBooks()

  const handleOpenBook = async (book: any) => {
    try {
        toast.loading("Abrindo documento...", { id: "open-book" })

        const { data } = await api.get(`/library/books/${book.id}/content`)
        
        const noteAdapter: Note = {
          id: book.id,
          title: book.title,
          preview: book.preview,
          tags: ["PDF", "Biblioteca"],
          createdAt: book.lastRead || new Date().toISOString(),
          x: 0, y: 0, z: 1, clusterId: "library"
        }
        
        setReadingBook({ note: noteAdapter, url: data.url })
        toast.dismiss("open-book")

    } catch (error) {
        console.error("Erro ao abrir livro:", error)
        toast.dismiss("open-book")
        toast.error("Não foi possível carregar o arquivo.", {
            description: "O arquivo pode ter sido movido ou você não tem permissão."
        })
    }
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
    // CORREÇÃO 1: h-full ao invés de min-h-screen para corrigir a rolagem dentro do layout pai
    <div className="h-full w-full bg-[#050505] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6 sticky top-0 bg-[#050505]/95 backdrop-blur z-10">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-1">
            Biblioteca Digital
          </h1>
          <p className="text-sm text-gray-400">Gerencie seus livros, artigos e documentos.</p>
        </div>
        
        {/* CORREÇÃO 3: Estilo explícito no botão para garantir legibilidade */}
        <Button 
            variant="outline" 
            onClick={() => setViewMode('galaxy')}
            className="border-white/20 text-black hover:text-white hover:bg-white/10 transition-colors gap-2"
        >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Galáxia
        </Button>
      </div>

      {/* States */}
      {isLoading && (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Sincronizando com o Núcleo...</p>
        </div>
      )}

      {isError && (
        <div className="h-64 flex flex-col items-center justify-center text-red-400 gap-4">
            <BookX className="w-8 h-8" />
            <p className="text-sm">Erro ao carregar biblioteca.</p>
        </div>
      )}

      {!isLoading && !isError && books?.length === 0 && (
        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
            <p>Sua biblioteca está vazia.</p>
            <p className="text-xs mt-2">Faça upload na tela de Pesquisa.</p>
        </div>
      )}

      {/* 
         CORREÇÃO 2: Grid Ajustado 
         - Aumentei o número de colunas (md:3, lg:4, xl:5, 2xl:6) para os cards ficarem menores.
         - Diminuí o gap.
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
        {books?.map((book: any, i: number) => {
            const coverUrl = book.coverUrl && book.coverUrl !== "" 
                ? book.coverUrl 
                : `https://picsum.photos/seed/${book.id}/300/450`; // Imagem menor no fallback
            
            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative flex flex-col gap-2"
              >
                {/* Capa */}
                <div 
                    className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-gray-800 border border-white/5"
                    onClick={() => handleOpenBook(book)}
                >
                    <img 
                        src={coverUrl} 
                        alt={book.title} 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                    />
                    
                    {/* Barra de Progresso Visual */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
                        <div className="h-full bg-blue-500" style={{ width: '0%' }} /> 
                    </div>

                    {/* Overlay Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-black/60 p-2 rounded-full border border-white/20">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-1 px-1">
                    <div className="flex justify-between items-start gap-2">
                        <h3 
                            className="font-medium text-sm leading-tight text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-2" 
                            title={book.title}
                        >
                            {book.title}
                        </h3>
                        <button className="text-gray-600 hover:text-white shrink-0"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 
                            {new Date(book.lastRead).toLocaleDateString()}
                        </span>
                        {/* <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500/50" /> 0%</span> */}
                    </div>
                </div>
              </motion.div>
            )
        })}
      </div>
    </div>
  )
}