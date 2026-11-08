import { defineConfig } from "@playwright/test";
const baseURL=process.env.GEOSUB_CHANGES_TEST_ORIGIN??"http://127.0.0.1:3185";
if(!["127.0.0.1","localhost","[::1]"].includes(new URL(baseURL).hostname))throw new Error("Local test server required");
export default defineConfig({testDir:"./tests/production",testMatch:"homepage-changes.spec.ts",workers:1,retries:0,timeout:30_000,use:{baseURL,channel:"chrome",trace:"retain-on-failure"}});
