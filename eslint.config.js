import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["src/client/**"],
  },
  {
    files: ["src/**/*.js", "bin/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-redeclare": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/client-source.js"],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        MutationObserver: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        console: "readonly",
        HTMLElement: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        NodeList: "readonly",
      },
    },
    rules: {
      "no-redeclare": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", vars: "local" }],
      "no-var": "off",
    },
  },
  eslintConfigPrettier,
];
