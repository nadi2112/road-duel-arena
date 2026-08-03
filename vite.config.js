import { defineConfig } from "vite";
import { cpSync } from "node:fs";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "preserve-classic-scripts",
      closeBundle() {
        cpSync("src", "dist/src", { recursive: true });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
});
