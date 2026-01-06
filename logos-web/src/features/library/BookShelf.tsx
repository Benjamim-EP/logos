import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Clock, MoreVertical, FileText, Loader2, BookX, ArrowLeft, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useGalaxyStore } from "@/stores/galaxyStore"
import { useUserStore } from "@/stores/userStore" // <--- Store de Usuário para Storage
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import { FileUploader } from "@/components/ui/file-uploader"
import { StorageIndicator } from "@/components/common/StorageIndicator" // <--- Componente de Storage
import type { Note } from "@/types/galaxy"
import { useLibraryBooks } from "@/features/library/hooks/useLibrary"
import api from "@/lib/api"
import { toast } from "sonner"

export function BookShelf() {
  const setViewMode = useGalaxyStore((state) => state.setViewMode)
  const { profile, fetchProfile } = useUserStore() // Hook para dados de storage

  const [readingBook, setReadingBook] = useState<{ note: Note, url: string } | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // React Query para cache e refetch simples
  const { data: books, isLoading, isError, refetch } = useLibraryBooks()

  // Garante que os dados de storage estejam atualizados ao entrar na biblioteca
  useEffect(() => {
    fetchProfile()
  }, [])

  // --- ABRIR LIVRO (COM SIGNED URL) ---
  const handleOpenBook = async (book: any) => {
    try {
        toast.loading("Abrindo documento...", { id: "open-book" })

        // 1. Pede URL temporária ao Backend
        const { data } = await api.get(`/library/books/${book.id}/content`)
        
        // 2. Adapta para o formato Note que o leitor espera
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
            description: "O link pode ter expirado ou você não tem permissão."
        })
    }
  }

  // --- UPLOAD DE ARQUIVO ---
  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      await api.post("/ingestion", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      
      toast.success("Upload iniciado!", {
        description: "Processando capa e vetores em segundo plano..."
      })
      
      setIsUploadOpen(false)
      
      // Atualiza a lista de livros e o storage após um tempo
      setTimeout(() => {
          refetch()
          fetchProfile()
      }, 2000)

    } catch (error: any) {
      console.error("Erro no upload:", error)
      toast.error("Falha no envio", {
        description: "Verifique o tamanho do arquivo ou sua conexão."
      })
    }
  }

  // --- MODO LEITURA ---
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
    // Container Principal (h-full para rolagem funcionar dentro do AppLayout)
    <div className="h-full w-full bg-[#050505] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar">
      
      {/* HEADER FIXO AO TOPO */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-white/10 pb-6 sticky top-0 bg-[#050505]/95 backdrop-blur z-10 gap-4">
        
        <div className="flex items-center gap-6 w-full md:w-auto">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-1">
                Biblioteca Digital
              </h1>
              <p className="text-sm text-gray-400">Gerencie seus livros, artigos e documentos.</p>
            </div>

            {/* INDICADOR DE STORAGE (Visível em Desktop) */}
            <div className="hidden lg:block w-48">
                 <StorageIndicator 
                    used={profile?.stats?.storageUsed || 0} 
                    limit={profile?.stats?.storageLimit || 100} 
                    className="py-2 px-3 bg-white/5 border-white/5 shadow-none"
                 />
            </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto justify-end">
            {/* BOTÃO VOLTAR */}
            <Button 
                variant="outline" 
                onClick={() => setViewMode('galaxy')}
                className="border-white/20 text-gray-200 hover:text-white hover:bg-white/10 transition-colors gap-2"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar
            </Button>

            {/* BOTÃO UPLOAD (MODAL) */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-white text-black hover:bg-gray-200 font-semibold shadow-lg shadow-white/10">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Livro
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-blue-500" /> Upload de Documento
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <FileUploader onUpload={handleFileUpload} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* ESTADOS DE CARREGAMENTO */}
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
            <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      )}

      {!isLoading && !isError && books?.length === 0 && (
        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
            <p>Sua biblioteca está vazia.</p>
            <Button variant="link" onClick={() => setIsUploadOpen(true)} className="text-blue-400">
                Clique aqui para adicionar seu primeiro documento.
            </Button>
        </div>
      )}

      {/* GRID DE LIVROS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
        {books?.map((book: any, i: number) => {
            // Tenta usar a capa real, se não tiver, usa fallback
            const hasCover = book.coverUrl && book.coverUrl.length > 10;
            
            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative flex flex-col gap-2"
              >
                {/* CAPA DO LIVRO */}
                <div 
                    className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-gray-800 border border-white/10"
                    onClick={() => handleOpenBook(book)}
                >
                    <img 
                        src={hasCover ? book.coverUrl : `https://picsum.photos/seed/${book.id}/300/450`} 
                        alt={book.title} 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                        // Fallback em caso de erro 404 (capa ainda processando)
                        onError={(e) => {
                            e.currentTarget.src = `https://picsum.photos/seed/${book.id}/300/450`;
                        }}
                    />
                    
                    {/* Barra de Progresso Visual (Futuro) */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
                        <div className="h-full bg-blue-500" style={{ width: '0%' }} /> 
                    </div>

                    {/* Overlay Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-black/60 p-3 rounded-full border border-white/20">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* METADADOS */}
                <div className="space-y-1 px-1">
                    <div className="flex justify-between items-start gap-2">
                        <h3 
                            className="font-medium text-sm leading-tight text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-2" 
                            title={book.title}
                        >
                            {book.title}
                        </h3>
                        <button className="text-gray-600 hover:text-white shrink-0">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 
                            {new Date(book.lastRead).toLocaleDateString()}
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