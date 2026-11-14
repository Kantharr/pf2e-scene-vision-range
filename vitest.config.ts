import { defineConfig } from "vitest/config";

// Dedicated test config so the unit runner does not inherit the lib-build
// vite.config.ts. The vision-cap logic has no Foundry/DOM deps.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
