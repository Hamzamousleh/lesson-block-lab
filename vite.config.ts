// Lovable's wrapper provides the TanStack Start, React, Tailwind, path-alias,
// Nitro build and preview configuration used by the existing Lovable project.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The split Cloudflare bundle currently creates a circular TanStack Start
// server chunk (`createCsrfMiddleware` becomes undefined at runtime). Lovable's
// supported single fetch bundle avoids that runtime-only failure.
if (
  (process.env["LOVABLE_SANDBOX"] === "1" || process.env["DEV_SERVER__PROJECT_PATH"]) &&
  !process.env["LOVABLE_NITRO_PRESET"]
) {
  process.env["LOVABLE_NITRO_PRESET"] = "lovable-fetch-bundle";
}

export default defineConfig({
  tanstackStart: {
    // Keep the existing SSR error wrapper as TanStack Start's server entry.
    server: { entry: "server" },
  },
});
