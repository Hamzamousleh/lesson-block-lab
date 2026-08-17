// Lovable's wrapper provides the TanStack Start, React, Tailwind, path-alias,
// Nitro build and preview configuration used by the existing Lovable project.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Sandbox/dev/preview: the split Cloudflare bundle creates a circular TanStack
// Start server chunk (`createCsrfMiddleware` becomes undefined at runtime), so
// keep using Lovable's supported single fetch bundle there.
process.env["LOVABLE_NITRO_PRESET"] = "lovable-fetch-bundle";

export default defineConfig({
  tanstackStart: {
    // Keep the existing SSR error wrapper as TanStack Start's server entry.
    server: { entry: "server" },
  },
});
