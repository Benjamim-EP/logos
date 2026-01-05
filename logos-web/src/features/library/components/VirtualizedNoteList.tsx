import type { Note } from "@/types/galaxy"
import { Virtuoso } from "react-virtuoso"
import { FileText, ChevronRight, Sparkles } from "lucide-react"
import { useSelectionStore } from "@/stores/selectionStore"

interface VirtualizedNoteListProps {
  notes: Note[]
}

const NoteListItem = ({ note }: { note: Note }) => {
  const setSelectedNote = useSelectionStore((state) => state.setSelectedNote)
  const isResume = note.tags?.includes("RESUME");

  return (
    <div 
      className="flex items-start justify-between p-4 border-b border-white/5 hover:bg-white/[0.03] transition-all cursor-pointer group"
      onClick={() => setSelectedNote(note)}
    >
      <div className="space-y-2 overflow-hidden flex-1">
        {/* TEXTO DA MARCAÇÃO (Agora é o principal) */}
        <p className="text-sm text-zinc-200 leading-relaxed line-clamp-2 italic font-serif">
          {isResume ? (
             <span className="flex items-center gap-2 text-cyan-400 not-italic font-sans font-bold text-[10px] uppercase tracking-widest mb-1">
                <Sparkles className="w-3 h-3" /> Resumo IA
             </span>
          ) : null}
          "{note.preview}"
        </p>

        {/* NOME DO LIVRO (Subtítulo) */}
        <div className="flex items-center text-[10px] text-zinc-500 gap-2">
          <FileText className="w-3 h-3" />
          <span className="truncate font-medium uppercase tracking-tight">{note.title}</span>
          <span>•</span>
          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="ml-4 pt-1">
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  )
}

export function VirtualizedNoteList({ notes }: VirtualizedNoteListProps) {
  return (
    <div className="h-full w-full">
      <Virtuoso
        style={{ height: '100%' }}
        data={notes}
        itemContent={(_, note) => <NoteListItem note={note} />}
        components={{ 
          Footer: () => (
            <p className="text-center text-zinc-700 py-10 text-[10px] uppercase tracking-widest font-bold">Fim da Galáxia</p>
          )
        }}
      />
    </div>
  )
}