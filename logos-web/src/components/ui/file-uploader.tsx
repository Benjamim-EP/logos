import { useCallback, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { UploadCloud, FileText, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner" // Notificações

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>
  maxSizeMB?: number
  acceptedTypes?: Record<string, string[]>
}

export function FileUploader({ 
  onUpload, 
  maxSizeMB = 10, 
  acceptedTypes = { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] } 
}: FileUploaderProps) {
  
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // Tratamento de Erros de Validação (Client-Side)
    if (fileRejections.length > 0) {
      const error = fileRejections[0].errors[0]
      if (error.code === "file-too-large") {
        toast.error(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`)
      } else if (error.code === "file-invalid-type") {
        toast.error("Tipo de arquivo não suportado. Use PDF ou Imagens.")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      toast.info("Arquivo preparado para envio.")
    }
  }, [maxSizeMB])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: acceptedTypes
  })

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(10) // Início fake

    try {
      // Simula progresso (no axios real usaríamos onUploadProgress)
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10))
      }, 200)

      await onUpload(file)

      clearInterval(interval)
      setProgress(100)
      toast.success("Upload realizado com sucesso!", {
        description: `${file.name} foi enviado para a galáxia.`
      })
      
      // Reset após sucesso
      setTimeout(() => {
        setFile(null)
        setUploading(false)
        setProgress(0)
      }, 1000)

    } catch (error: any) {
      setUploading(false)
      setProgress(0)
      console.error(error)
      // Tratamento de Erro Sênior: Mostrar o que o backend mandou ou mensagem genérica
      toast.error("Falha no Upload", {
        description: error.response?.data?.message || "Ocorreu um erro na comunicação com o servidor."
      })
    }
  }

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
  }

  return (
    <div className="w-full">
      {!file ? (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer group
            flex flex-col items-center justify-center text-center h-48
            ${isDragActive 
              ? "border-blue-500 bg-blue-500/10" 
              : "border-white/10 hover:border-white/30 hover:bg-white/5 bg-zinc-900/50"
            }
          `}
        >
          <input {...getInputProps()} />
          <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? "bg-blue-500/20" : "bg-white/5 group-hover:bg-white/10"}`}>
            <UploadCloud className={`w-8 h-8 ${isDragActive ? "text-blue-400" : "text-gray-400"}`} />
          </div>
          <p className="text-sm font-medium text-gray-300">
            {isDragActive ? "Solte o arquivo aqui..." : "Arraste seu PDF/Imagem ou clique para selecionar"}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Máximo {maxSizeMB}MB • PDF, PNG, JPG
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              
              {uploading && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={progress} className="h-1.5" />
                  <span className="text-[10px] text-gray-400 w-8 text-right">{progress}%</span>
                </div>
              )}
            </div>

            {!uploading ? (
              <div className="flex gap-2">
                <button 
                    onClick={removeFile}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleUpload}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                    Enviar
                </button>
              </div>
            ) : (
                <div className="p-2">
                    {progress === 100 ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 animate-pulse" />
                    ) : (
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    )}
                </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}