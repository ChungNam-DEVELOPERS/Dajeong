import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { ignores, sharedRules, typescriptRules } from "./shared.mjs";

export default [
  ignores,
  {
    ...js.configs.recommended,
    name: "@dajeong/config/javascript-recommended",
  },
  ...tseslint.configs.recommended,
  sharedRules,
  typescriptRules,
];
