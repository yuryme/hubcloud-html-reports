"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_TEMPLATE = "base-report";

function getTemplateDir(templateName) {
  return path.join(ROOT, "templates", templateName);
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function run() {
  const reportName = process.argv[2];
  const templateName = process.argv[3] || DEFAULT_TEMPLATE;
  if (!reportName) {
    console.error("Usage: node tools/create-report.js <report-name> [template-name]");
    process.exit(1);
  }

  const templateDir = getTemplateDir(templateName);
  if (!fs.existsSync(templateDir)) {
    console.error("Template not found:", templateDir);
    process.exit(1);
  }

  const outDir = path.join(ROOT, "reports", reportName);
  if (fs.existsSync(outDir)) {
    console.error("Target already exists:", outDir);
    process.exit(1);
  }

  copyRecursive(templateDir, outDir);
  console.log("Created report scaffold:");
  console.log(outDir);
  console.log("Template:");
  console.log(templateName);
}

run();
