// The Vite configuration includes the following plugins:
// - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro,
//   @ path alias, React/TanStack dedupe, and error logging.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        "**/.wwebjs_auth/**",
        "**/.wwebjs_cache/**",
        "**/RAG_vitals/**",
        "**/Whatsapp moderator/whatsapp-moderator-bot/.wwebjs_auth/**",
        "**/Whatsapp moderator/whatsapp-moderator-bot/.wwebjs_cache/**"
      ],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
