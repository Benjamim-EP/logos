import { HardDrive } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "react-i18next" // <--- Import

interface StorageIndicatorProps {
  used: number // em MB
  limit: number // em MB
  className?: string
}

export function StorageIndicator({ used, limit, className }: StorageIndicatorProps) {
  const { t } = useTranslation() 
  
  const percentage = Math.min(100, (used / limit) * 100)
  const isCritical = percentage > 90

  return (
    <div className={`bg-zinc-900/50 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-lg ${className}`}>
        <div className="flex justify-between text-xs mb-2">
            <span className="flex items-center gap-2 text-gray-300 font-medium">
                <HardDrive className={`w-3 h-3 ${isCritical ? 'text-red-500' : 'text-purple-400'}`}/> 
                {t('library.storage')} {/* <--- Traduzido */}
            </span>
            <span className={isCritical ? "text-red-400 font-bold" : "text-green-400 font-mono"}>
                {used}MB / {limit}MB
            </span>
        </div>
        <Progress value={percentage} className={`h-1.5 ${isCritical ? 'bg-red-900/20' : ''}`} />
    </div>
  )
}