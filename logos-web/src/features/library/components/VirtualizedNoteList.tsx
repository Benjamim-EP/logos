import type { Note } from "@/types/galaxy"
import { Virtuoso } from "react-virtuoso"
import { Text, Tag, Calendar, ChevronRight } from "lucide-react"
import { useSelectionStore } from "@/stores/selectionStore"

interface VirtualizedNoteListProps {
  notes: Note[]
}

// Item extraído para usar o Hook corretamente
const NoteListItem = ({ note }: { note: Note }) => {
  const setSelectedNote = useSelectionStore((state) => state.setSelectedNote)

  return (
    <div 
      className="flex items-center justify-between p-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
      onClick={() => {
        console.log("Lista clicada:", note.title) // Debug
        setSelectedNote(note)
      }}
    >
      <div className="space-y-1 overflow-hidden">
        <p className="text-sm font-semibold text-white truncate max-w-[200px] flex items-center gap-2">
          <Text className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="truncate">{note.title}</span>
        </p>
        <div className="flex items-center text-xs text-gray-400 gap-3">
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {note.tags[0]}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(note.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500 hover:text-white shrink-0" />
    </div>
  )
}

export function VirtualizedNoteList({ notes }: VirtualizedNoteListProps) {
  return (
    <div className="h-full w-full">
      <Virtuoso
        style={{ height: 'calc(100vh - 180px)' }} // Ajuste fino da altura
        data={notes}
        itemContent={(index, note) => <NoteListItem key={note.id} note={note} />}
        components={{ 
          Footer: () => (
            <p className="text-center text-gray-600 py-4 text-xs">Fim da Galáxia</p>
          )
        }}
      />
    </div>
  )
}