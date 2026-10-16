import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig(({ envMode }) => ({
  plugins: [pluginReact()],
  html: { template: "./index.html" },
  source: {
    entry: { index: "./src/main.tsx" },
    alias: { "@": "./src" },
  },
  output: {
    distPath: { root: "dist" },
    assetPrefix: envMode === "production" ? process.env.PUBLIC_BASE || "/sample-envelope/" : "/",
  },
}));
