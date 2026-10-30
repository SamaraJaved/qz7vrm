import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Recharts and React change far less often than app code, so ship them as cacheable chunks.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "charts", test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
});
