"use strict";

const fs = require("fs");
const path = require("path");

function readUtf8(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return null;
  }
}

function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").trim();
}

function extractScriptExpression(scriptText) {
  const match = String(scriptText || "").match(
    /getDatasourceExpression:\s*function\s*\(\)\s*\{\s*return\s*`([\s\S]*?)`;\s*\}/
  );
  return match ? match[1] : "";
}

function getLastExecutableLine(dsText) {
  const lines = normalizeText(dsText).split("\n");
  for (let i = lines.length - 1; i >= 0; --i) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("//")) {
      continue;
    }
    return line;
  }
  return "";
}

function run() {
  const root = process.cwd();
  const dsPath = path.join(root, "DS.txt");
  const scriptPath = path.join(root, "script.js");

  let hasError = false;

  console.log("HC DS Check");
  console.log("===========");

  const dsText = readUtf8(dsPath);
  if (dsText === null) {
    hasError = true;
    console.log("ERROR: missing DS.txt");
  } else {
    console.log("OK: DS.txt exists");
  }

  const scriptText = readUtf8(scriptPath);
  if (scriptText === null) {
    hasError = true;
    console.log("ERROR: missing script.js");
  } else {
    console.log("OK: script.js exists");
  }

  if (dsText !== null && scriptText !== null) {
    const dsNormalized = normalizeText(dsText);
    const expressionNormalized = normalizeText(extractScriptExpression(scriptText));

    if (!expressionNormalized) {
      hasError = true;
      console.log("ERROR: cannot extract getDatasourceExpression() from script.js");
    } else {
      console.log("OK: extracted getDatasourceExpression() from script.js");
    }

    if (dsNormalized !== expressionNormalized) {
      hasError = true;
      console.log("ERROR: DS.txt and getDatasourceExpression() are not identical.");
    } else {
      console.log("OK: DS.txt matches getDatasourceExpression().");
    }

    const lastLine = getLastExecutableLine(dsNormalized);
    if (lastLine && /;\s*$/.test(lastLine)) {
      hasError = true;
      console.log("ERROR: final executable DS line ends with ';' (forbidden).");
      console.log("Last line:", lastLine);
    } else {
      console.log("OK: final executable DS line does not end with ';'.");
    }
  }

  if (hasError) {
    console.log("\nFAILED: fix DS issues before transfer.");
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: DS checks are green.");
}

run();

