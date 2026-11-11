import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 120,
  trailingComma: "es5",
  sortPackageJson: false,
  astro: true,
  ignorePatterns: ["pnpm-lock.yaml", "internal-docs/"],
  sortTailwindcss: { stylesheet: "./src/styles/global.css" },
  sortImports: { groups: ["builtin", "external", "internal", ["parent", "sibling"], "type", "index"] },
});
