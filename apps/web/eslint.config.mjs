import baseConfig from "@dajeong/config/eslint/base";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  ...baseConfig,
  {
    name: "@dajeong/web/ignores",
    ignores: [".next/**", "build/**", "next-env.d.ts", "out/**"],
  },
];

export default eslintConfig;
