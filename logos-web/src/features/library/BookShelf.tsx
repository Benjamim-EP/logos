import { useState } from "react"
import { motion } from "framer-motion"
import { Book, Clock, Star, MoreVertical, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import type { Note } from "@/types/galaxy"

// --- MOCK DATA DE LIVROS ---
// Simulando o banco de dados de PDFs do usuário
const MOCK_BOOKS = [
  {
    id: "book-1",
    title: "Attention Is All You Need",
    author: "Ashish Vaswani et al.",
    cover: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop",
    progress: 75,
    lastRead: "2 horas atrás",
    tags: ["AI", "Paper"],
    pdfUrl: "/sample.pdf" // Aponta para o PDF local
  },
  {
    id: "book-2",
    title: "Clean Architecture",
    author: "Robert C. Martin",
    cover: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop",
    progress: 30,
    lastRead: "1 dia atrás",
    tags: ["Software", "Design"],
    pdfUrl: "/sample.pdf"
  },
  {
    id: "book-3",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt",
    cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop",
    progress: 10,
    lastRead: "5 dias atrás",
    tags: ["Career", "Dev"],
    pdfUrl: "/sample.pdf"
  },
  {
    id: "book-4",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    cover: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=600&auto=format&fit=crop",
    progress: 0,
    lastRead: "Nunca",
    tags: ["CS", "Hard"],
    pdfUrl: "/sample.pdf"
  }
]

export function BookShelf() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  const [readingBook, setReadingBook] = useState<any>(null)

  // Adaptador: Transforma o "Livro" em "Nota" para o leitor funcionar
  const handleOpenBook = (book: any) => {
    const noteAdapter: Note = {
      id: book.id,
      title: book.title,
      preview: "Livro completo...",
      tags: book.tags,
      createdAt: new Date().toISOString(),
      x: 0, y: 0, z: 1, clusterId: "library"
    }
    setReadingBook({ note: noteAdapter, url: book.pdfUrl })
  }

  // Se estiver lendo, mostra o leitor em cima de tudo
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
      
      {/* Header da Estante */}
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

      {/* Grid de Livros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {MOCK_BOOKS.map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative flex flex-col gap-3"
          >
            {/* Capa do Livro (Glassmorphism + Hover Effect) */}
            <div 
                className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                onClick={() => handleOpenBook(book)}
            >
                <img 
                    src={book.cover} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                />
                
                {/* Overlay de Progresso */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500" 
                        style={{ width: `${book.progress}%` }}
                    />
                </div>

                {/* Botão Play no Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-white/20 p-3 rounded-full border border-white/30 backdrop-blur-md">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>

            {/* Metadados */}
            <div className="space-y-1">
                <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg leading-tight truncate pr-2 group-hover:text-blue-400 transition-colors">
                        {book.title}
                    </h3>
                    <button className="text-gray-500 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-gray-400">{book.author}</p>
                
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {book.lastRead}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500/50" /> {book.progress}%</span>
                </div>
            </div>
          </motion.div>
        ))}

        {/* Card de Adicionar Novo (Placeholder) */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="aspect-[2/3] rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 cursor-pointer transition-all"
        >
            <div className="p-4 bg-white/5 rounded-full mb-3">
                <Book className="w-8 h-8" />
            </div>
            <p className="font-medium">Adicionar PDF</p>
        </motion.div>
      </div>
    </div>
  )
}