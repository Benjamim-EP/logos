import { Settings2, Filter, Calendar, Layers, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useGalaxyStore, type SortOrder } from "@/stores/galaxyStore"
import { useTranslation } from "react-i18next" // <--- ADD

export function GalaxyControls() {
  const { t } = useTranslation() // <--- ADD
  const { 
    clusters, activeClusterIds, toggleCluster, sortOrder, setSortOrder, getVisibleData, deleteGalaxy 
  } = useGalaxyStore()

  const { visibleNotes } = getVisibleData()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 bg-black/40 border-white/20 text-gray-300 hover:bg-white/10 hover:text-white backdrop-blur-md">
          <Settings2 className="w-3.5 h-3.5 mr-2" />
          {t('galaxy.config_view')} {/* TRADUZIDO */}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 bg-[#0a0a0a] border-white/10 text-white p-4 ml-4 shadow-2xl backdrop-blur-xl" side="right" align="start">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium leading-none flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" /> {t('galaxy.filters')}
            </h4>
            <span className="text-[10px] text-gray-500">
                {visibleNotes.length} notes
            </span>
          </div>

          <Separator className="bg-white/10" />

          {/* Clusters */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                <Layers className="w-3 h-3" /> {t('galaxy.visible_galaxies')}
            </div>
            
            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="flex items-center justify-between group hover:bg-white/5 p-1 rounded-md transition-colors">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <Checkbox 
                      id={cluster.id} 
                      checked={activeClusterIds.includes(cluster.id)}
                      onCheckedChange={() => toggleCluster(cluster.id)}
                      className="border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                    />
                    <Label htmlFor={cluster.id} className="text-xs cursor-pointer flex items-center gap-2 truncate" style={{ color: activeClusterIds.includes(cluster.id) ? 'white' : 'gray' }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                      <span className="truncate">{cluster.label}</span>
                    </Label>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteGalaxy(cluster.id) }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Sort */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> {t('galaxy.sort')}
            </div>
            <RadioGroup value={sortOrder} onValueChange={(val) => setSortOrder(val as SortOrder)} className="gap-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newest" id="r1" className="border-white/30 text-blue-500" />
                <Label htmlFor="r1" className="text-xs">{t('galaxy.sort_newest')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oldest" id="r2" className="border-white/30 text-blue-500" />
                <Label htmlFor="r2" className="text-xs">{t('galaxy.sort_oldest')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="relevance" id="r3" className="border-white/30 text-blue-500" />
                <Label htmlFor="r3" className="text-xs">{t('galaxy.sort_relevance')}</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}