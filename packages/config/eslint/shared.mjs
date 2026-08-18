export const ignores = {
  name: "@dajeong/config/ignores",
  ignores: [
    "**/node_modules/**",
    "**/.expo/**",
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
  ],
};

export const sharedRules = {
  name: "@dajeong/config/shared-rules",
  linterOptions: {
    reportUnusedDisableDirectives: "error",
  },
  rules: {
    eqeqeq: ["error", "always"],
  },
};

export const typescriptRules = {
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
};

export default [ignores, sharedRules, typescriptRules];
