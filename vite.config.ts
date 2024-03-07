import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/pepy": {
        target: "http://localhost:3000",
      },
      "/pypi": {
        target: "http://localhost:3000",
      },
      "/github": {
        target: "http://localhost:3000",
      },
      "/nixtla": {
        target: "http://localhost:3000",
      },
    },
  },
});
