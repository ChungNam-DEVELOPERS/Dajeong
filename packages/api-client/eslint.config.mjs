import baseConfig from "@dajeong/config/eslint/base";

export default [
  ...baseConfig,
  {
    name: "@dajeong/api-client/generated",
    ignores: ["src/generated/**"],
  },
];
