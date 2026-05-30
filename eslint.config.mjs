import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", ".claude/**", "node_modules/**", "test-results/**"],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
