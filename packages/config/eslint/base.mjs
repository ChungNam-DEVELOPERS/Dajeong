import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    name: "@dajeong/config/ignores",
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "**/.next/**",
      "**/coverage/**",
      "**/dist/**",
    ],
  },
  {
    ...js.configs.recommended,
    name: "@dajeong/config/javascript-recommended",
  },
  ...tseslint.configs.recommended,
  {
    name: "@dajeong/config/shared-rules",
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      eqeqeq: ["error", "always"],
    },
  },
  {
    name: "@dajeong/config/typescript-rules",
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
