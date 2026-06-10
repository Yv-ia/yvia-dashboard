import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Permet aux tests de résoudre les imports "@/..." comme le fait Next.js
// (cf. la clé "paths" de tsconfig.json : "@/*" -> "./src/*").
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
