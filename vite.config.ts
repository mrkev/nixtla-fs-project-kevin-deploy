import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Ideally, we'd be able to use the API directly from the frontend. I'll make
      // a server later. For now let's just proxy to pepy.
      // We can't due to CORS. I posted an issue on pepy's github here:
      // https://github.com/psincraian/pepy/issues/630
      "/pepy/": {
        target: "http://api.pepy.tech/",
        changeOrigin: true,
        secure: false,
        rewrite(path) {
          const res = path.replace(/^\/pepy/, "/api");
          return res;
        },
      },
    },
  },
});
