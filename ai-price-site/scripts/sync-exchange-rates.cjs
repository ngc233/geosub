#!/usr/bin/env node

const path = require("node:path");
const { pathToFileURL } = require("node:url");

const scriptPath = path.resolve(
  __dirname,
  "..",
  "..",
  "geosub-backend",
  "scripts",
  "sync-exchange-rates.mjs",
);

import(pathToFileURL(scriptPath).href)
  .then(({ runCli }) => runCli(process.argv.slice(2)))
  .catch((error) => {
    console.error(`FAIL  ${error.message}`);
    process.exitCode = 1;
  });
