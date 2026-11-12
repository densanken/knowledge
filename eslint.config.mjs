import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import prettier from "eslint-config-prettier";
import pluginAstro from "eslint-plugin-astro";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ["node_modules/", "dist/", ".astro/", "internal-docs/", "eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...pluginAstro.configs.recommended,

  // .astro ファイルがパースエラーになるのを防ぐ
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: ["**/*.{ts,tsx}"] })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({ ...config, files: ["**/*.{ts,tsx}"] })),

  {
    plugins: { "@stylistic": stylistic },
    rules: {
      "no-console": "warn",
      "prefer-template": "error",
      "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: 'ImportSpecifier[importKind="type"]', message: "Use a top-level type import." },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReact.configs["jsx-runtime"].rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.flatConfigs.recommended.rules,
      "react/jsx-sort-props": "error",
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "19",
      },
    },
  },
  prettier,
];
