import react from "@vitejs/plugin-react";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vite";
import apiHandler from "./api/handler.ts";

/** Serves the same /api/* function Vercel deploys, so `npm run dev` works end-to-end. */
function localApi(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use("/api", (req, res) => apiHandler(req, res));
  };
  return {
    name: "pbi-local-api",
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
});
