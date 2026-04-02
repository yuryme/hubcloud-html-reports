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

function extractVueHandlerNames(indexHtml) {
  const names = new Set();
  const pattern = /v-on:[^=]+="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(indexHtml || "")) !== null) {
    const expression = String(match[1] || "").trim();
    const nameMatch = expression.match(/^([A-Za-z_$][\w$]*)/);
    if (nameMatch && nameMatch[1]) {
      names.add(nameMatch[1]);
    }
  }
  return names;
}

function extractMethodNames(scriptText) {
  const names = new Set();
  const methodPattern = /([A-Za-z_$][\w$]*)\s*:\s*function\s*\(/g;
  let match;
  while ((match = methodPattern.exec(scriptText || "")) !== null) {
    names.add(match[1]);
  }
  return names;
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
  const script = readFileSafe(path.join(root, "script.js"));
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

  if (html !== null && script !== null) {
    const handlers = extractVueHandlerNames(html);
    const methods = extractMethodNames(script);
    let missingCount = 0;

    for (const handlerName of handlers) {
      if (!methods.has(handlerName)) {
        hasError = true;
        missingCount += 1;
        console.log(`ERROR: index.html references handler '${handlerName}', but method is missing in script.js.`);
      }
    }

    if (missingCount === 0) {
      console.log("OK: all Vue handlers from index.html are implemented in script.js.");
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
