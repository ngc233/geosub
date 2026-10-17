import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-admin-save/**",
    ".next-admin-reliability/**",
    ".next-admin-nav/**",
    ".next-legacy-acceptance/**",
    ".next-e2e/**",
    ".next-promotion/**",
    ".next-promotion-build/**",
    ".next-promotion-preprod/**",
    ".next-admin-followup/**",
    ".next-admin-effects/**",
    ".next-admin-acceptance/**",
    ".next-release-acceptance/**",
    ".next-preflight-acceptance/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/**/*.cjs",
    "scripts/**/*.cjs",
    "types/**/*.d.ts",
  ]),
]);

export default eslintConfig;
