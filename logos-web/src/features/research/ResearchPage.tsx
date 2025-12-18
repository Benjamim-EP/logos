import { useState } from "react"
import { useResearchStore, type ResearchPaper } from "@/stores/researchStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Save, Check, FileText, ExternalLink, HardDrive, Loader2 } from "lucide-react"
import { PdfReaderView } from "@/features/reader/PdfReaderView" // Reutilizando nosso leitor!

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

  // Adapter para abrir o nosso leitor de PDF
  const handleRead = (paper: ResearchPaper) => {
    // TRUQUE SÊNIOR: Para garantir que a demo funcione sem erro de CORS de sites externos,
    // vamos abrir o nosso 'sample.pdf' local, mas com o Título do paper real.
    // Em produção, usaríamos um Proxy no backend Java para baixar o PDF real.
    const noteAdapter: any = {
      id: paper.id,
      title: paper.title,
      tags: [area, "Research"],
    }
    setReadingPaper({ ...paper, ...noteAdapter })
  }

  if (readingPaper) {
    return (
      <PdfReaderView 
        note={readingPaper as any} 
        pdfUrl="/sample.pdf" // Usando local para estabilidade da demo
        onClose={() => setReadingPaper(null)} 
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 overflow-y-auto">
      
      {/* HEADER & STORAGE */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Laboratório de Pesquisa
          </h1>
          <p className="text-gray-400 mt-2">Busca semântica em 200M+ de artigos acadêmicos (OpenAlex).</p>
        </div>

        {/* Card de Storage (SaaS Feature) */}
        <div className="w-full md:w-64 bg-zinc-900/50 border border-white/10 p-4 rounded-xl backdrop-blur-md">
            <div className="flex justify-between text-xs mb-2">
                <span className="flex items-center gap-2 text-gray-300"><HardDrive className="w-3 h-3"/> Armazenamento</span>
                <span className={storageUsed > 90 ? "text-red-400" : "text-green-400"}>
                    {storageUsed}MB / {storageLimit}MB
                </span>
            </div>
            <Progress value={(storageUsed / storageLimit) * 100} className="h-2" />
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-3xl mx-auto mb-12 sticky top-4 z-30">
        <form onSubmit={handleSearch} className="flex gap-2 p-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
            <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="w-[180px] rounded-l-full border-0 bg-transparent focus:ring-0 text-gray-300">
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
                className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-600 flex-1 h-10"
            />
            
            <Button type="submit" size="icon" className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />}
            </Button>
        </form>
      </div>

      {/* RESULTS GRID */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-4">
        {results.map((paper) => (
            <div key={paper.id} className="group bg-zinc-900/30 border border-white/5 hover:border-blue-500/30 rounded-xl p-6 transition-all hover:bg-zinc-900/50 flex flex-col md:flex-row gap-6">
                
                {/* Info Principal */}
                <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/5">
                            {paper.year}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-white/10 text-gray-400">
                            {paper.venue}
                        </Badge>
                        <span className="text-xs text-yellow-500/80 flex items-center gap-1">
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
                <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                    <Button 
                        onClick={() => handleRead(paper)}
                        className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
                    >
                        <FileText className="w-4 h-4 mr-2" /> Ler PDF
                    </Button>

                    <Button 
                        variant={paper.isSaved ? "secondary" : "outline"}
                        onClick={() => !paper.isSaved && savePaper(paper)}
                        disabled={paper.isSaved}
                        className={`w-full ${paper.isSaved ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'border-white/10 hover:border-white/30 text-gray-400'}`}
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
            <div className="text-center text-gray-500 py-20">
                Nenhum resultado encontrado. Tente termos em inglês para melhores resultados.
            </div>
        )}
      </div>

    </div>
  )
}