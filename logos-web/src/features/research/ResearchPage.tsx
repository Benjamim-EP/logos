import { useState } from "react"
import { useResearchStore, type ResearchPaper } from "@/stores/researchStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Save, Check, FileText, ExternalLink, HardDrive, Loader2, UploadCloud } from "lucide-react"
import { PdfReaderView } from "@/features/reader/PdfReaderView"
import { FileUploader } from "@/components/ui/file-uploader" // Nosso novo componente
import api from "@/lib/api" // Cliente Axios configurado com JWT

const AREAS = [
  { value: "all", label: "Todas as Áreas" },
  { value: "Medicine", label: "Medicina & Saúde" },
  { value: "Computer Science", label: "Computação" },
  { value: "Philosophy", label: "Filosofia" },
  { value: "Psychology", label: "Psicologia" },
  { value: "History", label: "História" },
]

export function ResearchPage() {
  const { results, search, isLoading, savePaper, storageUsed, storageLimit } = useResearchStore()
  
  const [query, setQuery] = useState("")
  const [area, setArea] = useState("all")
  
  // Estado para controlar a leitura (Reuso do componente de PDF)
  const [readingPaper, setReadingPaper] = useState<ResearchPaper | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    search(query, area)
  }

  // Função de Upload Real (Conectada ao Backend Java)
  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      // POST para o Gateway (/api/ingestion)
      // O Axios injeta o Token 'Bearer ...' automaticamente aqui
      await api.post("/ingestion", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
      
      // Feedback visual imediato (Otimistic UI)
      toast.success("Arquivo enviado para processamento!", {
        description: "A IA está analisando. Verifique a Galáxia em instantes."
      })
      
    } catch (error: any) {
      console.error("Erro no upload:", error)
      // Se der 401, o Gateway barrou. Se der 500, foi o Ingestion.
      toast.error("Falha no envio", {
        description: error.response?.status === 401 
          ? "Sessão expirada. Faça login novamente." 
          : "Erro interno do servidor."
      })
    }
  }

  // Adapter para abrir o nosso leitor de PDF com dados do OpenAlex
  const handleRead = (paper: ResearchPaper) => {
    // Nota: Usamos o sample.pdf local para evitar erros de CORS na demo web.
    // Em produção, o backend serviria o PDF via Proxy.
    const noteAdapter: any = {
      id: paper.id,
      title: paper.title,
      tags: [area !== 'all' ? area : "Pesquisa", "OpenAlex"],
    }
    setReadingPaper({ ...paper, ...noteAdapter })
  }

  // Renderiza o Leitor se houver um paper selecionado
  if (readingPaper) {
    return (
      <PdfReaderView 
        note={readingPaper as any} 
        pdfUrl="/sample.pdf" 
        onClose={() => setReadingPaper(null)} 
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 overflow-y-auto custom-scrollbar">
      
      {/* --- HEADER & STORAGE --- */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Laboratório de Pesquisa
          </h1>
          <p className="text-gray-400 mt-2">
            Ingestão de arquivos próprios e busca semântica em 200M+ de artigos (OpenAlex).
          </p>
        </div>

        {/* Card de Storage (SaaS Feature) */}
        <div className="w-full md:w-64 bg-zinc-900/50 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-lg">
            <div className="flex justify-between text-xs mb-2">
                <span className="flex items-center gap-2 text-gray-300 font-medium">
                    <HardDrive className="w-3 h-3 text-purple-400"/> Armazenamento
                </span>
                <span className={storageUsed > 90 ? "text-red-400" : "text-green-400 font-mono"}>
                    {storageUsed}MB / {storageLimit}MB
                </span>
            </div>
            <Progress value={(storageUsed / storageLimit) * 100} className="h-1.5" />
        </div>
      </div>

      {/* --- NOVA SEÇÃO: ÁREA DE UPLOAD (Drag & Drop) --- */}
      <div className="max-w-3xl mx-auto mb-16">
        <div className="bg-gradient-to-b from-white/5 to-transparent p-[1px] rounded-2xl">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-1 shadow-2xl">
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-white/5">
                    <h2 className="text-lg font-semibold mb-1 text-white flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-purple-400" /> Ingestão de Conhecimento
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">
                        Envie PDFs ou Imagens para nossa IA processar, vetorizar e adicionar à sua Galáxia.
                    </p>
                    
                    {/* Componente de Upload Sênior */}
                    <FileUploader onUpload={handleFileUpload} />
                    
                </div>
            </div>
        </div>
      </div>

      {/* --- SEARCH BAR (OpenAlex) --- */}
      <div className="max-w-3xl mx-auto mb-12 sticky top-4 z-30">
        <form onSubmit={handleSearch} className="flex gap-2 p-2 bg-black/80 backdrop-blur-xl border border-white/15 rounded-full shadow-2xl transition-all focus-within:border-blue-500/50">
            <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="w-[180px] rounded-l-full border-0 bg-transparent focus:ring-0 text-gray-300 font-medium hover:text-white">
                    <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                    {AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <div className="w-px h-8 bg-white/10 self-center mx-2" />
            
            <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: impacto do jejum intermitente na insulina..." 
                className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500 flex-1 h-10"
            />
            
            <Button type="submit" size="icon" className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400/30">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />}
            </Button>
        </form>
      </div>

      {/* --- RESULTS GRID --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-4 pb-20">
        {results.map((paper) => (
            <div key={paper.id} className="group bg-zinc-900/30 border border-white/5 hover:border-blue-500/30 rounded-xl p-6 transition-all hover:bg-zinc-900/60 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                
                {/* Glow Effect on Hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Info Principal */}
                <div className="flex-1 space-y-3 relative z-10">
                    <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/5">
                            {paper.year}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-white/10 text-gray-400 max-w-[200px] truncate">
                            {paper.venue}
                        </Badge>
                        <span className="text-xs text-yellow-500/80 flex items-center gap-1 ml-1 font-medium">
                            ⭐ {paper.citations} citações
                        </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-100 leading-tight group-hover:text-blue-300 transition-colors">
                        {paper.title}
                    </h3>
                    
                    <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                        {paper.abstract}
                    </p>
                </div>

                {/* Ações */}
                <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[150px] relative z-10">
                    <Button 
                        onClick={() => handleRead(paper)}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20"
                    >
                        <FileText className="w-4 h-4 mr-2" /> Ler PDF
                    </Button>

                    <Button 
                        variant={paper.isSaved ? "secondary" : "outline"}
                        onClick={() => !paper.isSaved && savePaper(paper)}
                        disabled={paper.isSaved}
                        className={`w-full ${paper.isSaved ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'border-white/10 hover:border-white/30 text-gray-400'}`}
                    >
                        {paper.isSaved ? (
                            <><Check className="w-4 h-4 mr-2" /> Salvo</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" /> Salvar ({paper.sizeMB}MB)</>
                        )}
                    </Button>

                    {paper.pdfUrl && (
                        <a href={paper.pdfUrl} target="_blank" rel="noreferrer" className="w-full">
                            <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500 hover:text-white">
                                <ExternalLink className="w-3 h-3 mr-2" /> Fonte Original
                            </Button>
                        </a>
                    )}
                </div>

            </div>
        ))}
        
        {!isLoading && results.length === 0 && query && (
            <div className="text-center text-gray-500 py-20 flex flex-col items-center gap-4">
                <Search className="w-12 h-12 text-gray-700" />
                <p>Nenhum resultado encontrado no OpenAlex para esta busca.</p>
                <p className="text-xs text-gray-600">Tente usar termos em inglês (ex: "Neural Networks") para melhores resultados.</p>
            </div>
        )}
      </div>

    </div>
  )
}