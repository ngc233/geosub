import { defineConfig } from "@playwright/test";
export default defineConfig({testDir:"./e2e",testMatch:"public-chrome.spec.ts",workers:1,projects:[{name:"local-chrome-acceptance"}],reporter:"list",timeout:90000,
  outputDir:process.env.GEOSUB_V2_EVIDENCE || "/tmp/geosub-v2-evidence",
  use:{channel:"chrome",launchOptions:{ignoreDefaultArgs:["--hide-scrollbars"]},contextOptions:{reducedMotion:"reduce"},baseURL:"http://127.0.0.1:3143"}});
