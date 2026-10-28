import { defineConfig } from "vite";

const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS === "true" ? "/kattak/" : "/");

export default defineConfig({
  base,
  build: {
    // Phaser change rarement : un chunk séparé reste en cache entre deux déploiements.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
