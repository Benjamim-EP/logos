import { Dialog, DialogContent,DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BrainCircuit, Plus} from "lucide-react"
import { useWorkbenchStore } from "@/stores/workbenchStore"

export function SuggestionsModal() {
  const { isSuggestionsOpen, suggestions, closeSuggestions, addSuggestionToCanvas } = useWorkbenchStore()

  return (
    <Dialog open={isSuggestionsOpen} onOpenChange={(open) => !open && closeSuggestions()}>
      <DialogContent className="max-w-xl bg-zinc-950 border border-white/10 text-white p-0 overflow-hidden shadow-2xl">
        
        <div className="p-6 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="w-5 h-5 text-cyan-400" /> 
                Sugestões da IA ({suggestions.length})
            </DialogTitle>
        </div>

        <ScrollArea className="h-[400px] p-6">
            <div className="space-y-4">
                {suggestions.map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors group">
                        
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.highlightId.startsWith('summary') ? 'bg-cyan-500/20 text-cyan-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                    {s.highlightId.startsWith('summary') ? 'RESUMO' : 'TRECHO'}
                                </span>
                                <span className="text-xs text-green-400 font-mono">
                                    {(s.score * 100).toFixed(0)}% Similar
                                </span>
                            </div>
                            
                            <Button 
                                size="sm" 
                                onClick={() => addSuggestionToCanvas(s, s.originNodeId)}
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1"
                            >
                                <Plus className="w-3 h-3" /> Adicionar
                            </Button>
                        </div>

                        <p className="text-sm text-zinc-300 italic line-clamp-3 leading-relaxed">
                            "{s.text || "Conteúdo não disponível para visualização..."}"
                        </p>
                    </div>
                ))}
            </div>
        </ScrollArea>

        <div className="p-4 bg-zinc-900/50 border-t border-white/5 flex justify-end">
            <Button variant="ghost" onClick={closeSuggestions} className="text-zinc-400 hover:text-white">
                Fechar
            </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}