import { useState, useEffect } from "react"
import { useResearchStore, type ResearchPaper } from "@/stores/researchStore"
import { useUserStore } from "@/stores/userStore" // Para pegar o storage real
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Save, Check, FileText, ExternalLink, Loader2, UploadCloud } from "lucide-react"
import { FileUploader } from "@/components/ui/file-uploader"
import { StorageIndicator } from "@/components/common/StorageIndicator" // Componente Novo
import api from "@/lib/api"
import { toast } from "sonner" 

const AREAS = [
  { value: "all", label: "Todas as Áreas" },
  { value: "Artificial Intelligence", label: "IA & Machine Learning" },
  { value: "Medicine", label: "Medicina" },
  { value: "Law", label: "Direito" },
  { value: "History", label: "História" },
  { value: "Engineering", label: "Engenharia" },
]

export function ResearchPage() {
  const { results, search, isLoading, savePaper } = useResearchStore()
  const { profile, fetchProfile } = useUserStore() // Dados reais de storage
  
  const [query, setQuery] = useState("")
  const [area, setArea] = useState("all")

  // Carrega "Novidades" ao entrar e atualiza storage
  useEffect(() => {
    fetchProfile()
    if (results.length === 0) {
        search("artificial intelligence", "all") // Busca inicial padrão para não ficar vazio
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    search(query, area)
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      await api.post("/ingestion", formData, { headers: { "Content-Type": "multipart/form-data" } })
      toast.success("Upload iniciado!", { description: "Processando..." })
      setTimeout(() => fetchProfile(), 2000) // Atualiza storage
    } catch (error) {
      toast.error("Falha no envio")
    }
  }

  return (
    // CORREÇÃO SCROLL: h-full e overflow-y-auto
    <div className="h-full w-full bg-[#050505] text-white p-6 md:p-12 overflow-y-auto custom-scrollbar">
      
      {/* HEADER & STORAGE */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Laboratório de Pesquisa
          </h1>
          <p className="text-gray-400 mt-2">
            Ingestão de arquivos próprios e busca semântica global.
          </p>
        </div>

        {/* INDICADOR DE STORAGE REAL */}
        <div className="w-full md:w-72">
            <StorageIndicator 
                used={profile?.stats?.storageUsed || 0} 
                limit={profile?.stats?.storageLimit || 100} 
            />
        </div>
      </div>

      {/* ÁREA DE UPLOAD */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="bg-gradient-to-b from-white/5 to-transparent p-[1px] rounded-2xl">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-1 shadow-2xl">
                <div className="bg-zinc-900/50 rounded-xl p-8 border border-white/5 flex flex-col items-center text-center">
                    <div className="p-3 bg-purple-500/10 rounded-full mb-4">
                        <UploadCloud className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-white">Upload de Conhecimento</h2>
                    <p className="text-sm text-gray-400 mb-6 max-w-md">
                        Arraste PDFs técnicos, artigos ou imagens para processamento vetorial imediato.
                    </p>
                    <div className="w-full max-w-lg">
                        <FileUploader onUpload={handleFileUpload} />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="max-w-4xl mx-auto mb-12 sticky top-0 z-30 pt-4 bg-[#050505]/95 backdrop-blur">
        <form onSubmit={handleSearch} className="flex gap-2 p-2 bg-zinc-900/90 border border-white/15 rounded-full shadow-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20">
            <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="w-[180px] rounded-l-full border-0 bg-transparent focus:ring-0 text-gray-300 font-medium hover:text-white pl-6">
                    <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                    {AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <div className="w-px h-6 bg-white/10 self-center mx-2" />
            
            <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar papers (ex: Quantum Computing)..." 
                className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500 flex-1 h-10 text-base"
            />
            
            <Button type="submit" size="icon" className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400/30 mr-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />}
            </Button>
        </form>
      </div>

      {/* GRID DE RESULTADOS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-4 pb-20">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 pl-2">
            {isLoading ? "Buscando..." : query ? "Resultados da Busca" : "Publicações Recentes"}
        </h3>
        
        {results.map((paper) => (
            <div key={paper.id} className="group bg-zinc-900/40 border border-white/5 hover:border-blue-500/30 rounded-xl p-6 transition-all hover:bg-zinc-900/80 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex-1 space-y-3 relative z-10">
                    <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/5 px-2 py-0.5">
                            {paper.year}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400 max-w-[300px] truncate px-2 py-0.5">
                            {paper.venue}
                        </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-gray-100 leading-snug group-hover:text-blue-300 transition-colors">
                        {paper.title}
                    </h3>
                    
                    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                        {paper.abstract}
                    </p>
                </div>

                <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[160px] relative z-10">
                    <Button 
                        onClick={() => paper.pdfUrl && window.open(paper.pdfUrl, '_blank')}
                        disabled={!paper.pdfUrl}
                        size="sm"
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs"
                    >
                        <FileText className="w-3.5 h-3.5 mr-2" /> Ler PDF (Fonte)
                    </Button>

                    <Button 
                        variant={paper.isSaved ? "secondary" : "outline"}
                        onClick={() => !paper.isSaved && savePaper(paper)}
                        disabled={paper.isSaved}
                        size="sm"
                        className={`w-full text-xs ${paper.isSaved ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'border-white/10 hover:border-white/30 text-gray-400'}`}
                    >
                        {paper.isSaved ? (
                            <><Check className="w-3.5 h-3.5 mr-2" /> Salvo</>
                        ) : (
                            <><Save className="w-3.5 h-3.5 mr-2" /> Salvar ({paper.sizeMB}MB)</>
                        )}
                    </Button>
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}