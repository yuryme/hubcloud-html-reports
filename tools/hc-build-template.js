"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "template-pack", "hubcloud-report-template");

const FILES_TO_COPY = [
  "index.html",
  "hc-report.css",
  "script.js",
  "LOCAL_DEV.md",
  "HUBCLOUD_COMPAT.md",
  "COLLABORATION_PROTOCOL.md",
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(OUT_DIR, relPath);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function run() {
  ensureDir(OUT_DIR);
  let hasError = false;

  console.log("Build HubCloud Template Pack");
  console.log("===========================");

  for (const relPath of FILES_TO_COPY) {
    const src = path.join(ROOT, relPath);
    if (!fs.existsSync(src)) {
      hasError = true;
      console.log("ERROR: missing source file:", relPath);
      continue;
    }
    copyFile(relPath);
    console.log("OK: copied", relPath);
  }

  if (hasError) {
    console.log("\nFAILED: template pack build has missing files.");
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: template pack ready at:");
  console.log(OUT_DIR);
}

run();
