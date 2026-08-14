// Lovable's wrapper provides the TanStack Start, React, Tailwind, path-alias,
// Nitro build and preview configuration used by the existing Lovable project.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Keep the existing SSR error wrapper as TanStack Start's server entry.
    server: { entry: "server" },
  },
});
