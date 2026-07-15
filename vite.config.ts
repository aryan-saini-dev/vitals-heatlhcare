// The Vite configuration includes the following plugins:
// - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro,
//   @ path alias, React/TanStack dedupe, and error logging.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4000",
          changeOrigin: true,
        },
      },
    },
  },
});
