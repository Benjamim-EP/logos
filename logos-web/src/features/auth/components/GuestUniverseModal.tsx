import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Book, Sparkles, ArrowRight, Globe } from "lucide-react"
import { motion } from "framer-motion"
import api from "@/lib/api" // Importe seu cliente axios

// Interface baseada no seu SQL
interface PublicUniverse {
    id: string
    titleKey: string
    descriptionKey: string
    imageUrl: string
    nodeCount: number
    pineconeFilterValue: string
    availableLanguages: string[]
}

interface GuestUniverseModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (universeId: string, lang: string, pineconeFilter: string) => void
    onSelectEmpty: () => void
}

export function GuestUniverseModal({ isOpen, onClose, onSelect, onSelectEmpty }: GuestUniverseModalProps) {
    const { t } = useTranslation()
    const [universes, setUniverses] = useState<PublicUniverse[]>([])

    // Busca os universos do banco (Postgres) via Library Service
    useEffect(() => {
        if (isOpen) {
            api.get('/public/universes')
                .then(res => setUniverses(res.data))
                .catch(err => console.error("Erro ao carregar universos", err))
        }
    }, [isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-[#0a0a0a] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                <div className="p-8">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            Escolha seu ponto de partida
                        </DialogTitle>
                        <p className="text-gray-400">
                            Explore universos pré-processados ou comece do zero. Nenhuma conta necessária.
                        </p>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. UNIVERSOS DO BANCO (BÍBLIA) */}
                        {universes.map((univ) => (
                            <div key={univ.id} className="group relative h-64 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-default">
                                {/* Imagem de Fundo */}
                                <img 
                                    src={univ.imageUrl} 
                                    alt="Cover" 
                                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-20 transition-opacity duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                                {/* Conteúdo */}
                                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                    <h3 className="text-2xl font-bold text-white mb-1">{t(univ.titleKey)}</h3>
                                    <p className="text-sm text-gray-300 line-clamp-2 mb-4">{t(univ.descriptionKey)}</p>
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20">
                                            {univ.nodeCount.toLocaleString()} Estrelas
                                        </span>
                                    </div>

                                    {/* SELETOR DE IDIOMA (Hover) */}
                                    {/* No mobile aparece sempre, no desktop no hover */}
                                    <div className="translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 absolute inset-x-6 bottom-6 flex gap-2">
                                        {univ.availableLanguages.map(lang => (
                                            <Button 
                                                key={lang}
                                                size="sm"
                                                onClick={() => onSelect(univ.id, lang, univ.pineconeFilterValue)}
                                                className="flex-1 bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md"
                                            >
                                                {lang === 'pt' && "🇧🇷 Português"}
                                                {lang === 'en' && "🇺🇸 English"}
                                                {lang === 'pl' && "🇵🇱 Polski"}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* 2. UNIVERSO VAZIO */}
                        <div 
                            onClick={onSelectEmpty}
                            className="group h-64 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 bg-transparent hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all"
                        >
                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 mb-4">
                                <Sparkles className="w-8 h-8 text-gray-400 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-300 group-hover:text-white">
                                {t('universe.empty.title')}
                            </h3>
                            <p className="text-sm text-gray-500 mt-2">
                                {t('universe.empty.desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}