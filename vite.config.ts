import { execFileSync } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// In watch mode only, copy dist/ into Foundry's modules folder after each
// rebuild (this machine's Foundry skips symlinked module dirs, so a real copy
// is required). `npm run build` stays pure so CI/release builds don't touch a
// local Foundry install.
function foundryWatchDeploy(): Plugin {
  let isWatch = false;
  return {
    name: "foundry-watch-deploy",
    configResolved(config) {
      isWatch = Boolean(config.build.watch);
    },
    closeBundle() {
      if (!isWatch) return;
      try {
        execFileSync("node", ["scripts/deploy.mjs"], { stdio: "inherit" });
      } catch (err) {
        this.warn(`foundry-watch-deploy: copy failed - ${(err as Error).message}`);
      }
    },
  };
}

// Single ESM bundle -> dist/scripts/module.js (referenced by module.json's
// esmodules). The manifest and lang files are copied into dist/ so the whole
// dist/ folder is the installable module.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: "src/module.ts",
      formats: ["es"],
      fileName: () => "scripts/module.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "scripts/module.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  plugins: [
    foundryWatchDeploy(),
    viteStaticCopy({
      targets: [
        { src: "module.json", dest: "." },
        { src: "lang", dest: "." },
      ],
    }),
  ],
});
