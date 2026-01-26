import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path" // <--- Importante

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // Se estiver em produção (GitHub Pages), usa /logos/. 
    // Em desenvolvimento (localhost), usa a raiz /
    base: mode === 'production' ? '/logos/' : '/', 
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})