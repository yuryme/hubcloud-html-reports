"use strict";

const fs = require("fs");
const path = require("path");

const requiredFiles = [
  "index.html",
  "hc-report.css",
  "script.js",
];

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return null;
  }
}

function hasStyleTag(htmlText) {
  return /<style[\s>]/i.test(htmlText || "");
}

function hasMustache(text) {
  return /\{\{[\s\S]*?\}\}/.test(text || "");
}

function run() {
  const root = process.cwd();
  let hasError = false;

  console.log("HC Transfer Check");
  console.log("=================");

  for (const fileName of requiredFiles) {
    const abs = path.join(root, fileName);
    if (!fs.existsSync(abs)) {
      hasError = true;
      console.log("ERROR: missing file:", fileName);
    } else {
      console.log("OK: file exists:", fileName);
    }
  }

  const html = readFileSafe(path.join(root, "index.html"));
  if (html !== null) {
    if (hasStyleTag(html)) {
      hasError = true;
      console.log("ERROR: index.html contains <style> tag; move CSS to Styles tab.");
    } else {
      console.log("OK: index.html has no <style> tag.");
    }
    if (hasMustache(html)) {
      hasError = true;
      console.log("ERROR: index.html contains moustache interpolation.");
    } else {
      console.log("OK: index.html has no moustache interpolation.");
    }
  }

  if (hasError) {
    console.log("\nFAILED: fix issues before transfer.");
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: ready for HubCloud tab transfer.");
  console.log("Mapping:");
  console.log("- HTML   <- index.html");
  console.log("- Styles <- hc-report.css");
  console.log("- Scripts<- script.js");
}

run();
