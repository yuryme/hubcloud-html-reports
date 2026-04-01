const fs = require("fs");
const path = require("path");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function unique(items) {
  return Array.from(new Set(items));
}

function collectMatches(text, regex, groupIndex) {
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[groupIndex]);
  }
  return unique(matches);
}

function hasPattern(text, pattern) {
  return pattern.test(text);
}

const targetArg = process.argv[2];
if (!targetArg) {
  console.error("Usage: node tools/hc-factory-lint.js <report-folder>");
  process.exit(1);
}

const cwd = process.cwd();
const reportDir = path.resolve(cwd, targetArg);
const indexPath = path.join(reportDir, "index.html");
const scriptPath = path.join(reportDir, "script.js");
const cssPath = path.join(reportDir, "hc-report.css");

console.log("HubCloud Factory Lint");
console.log("=====================");
console.log("Target:", reportDir);

let failed = false;

function ok(message) {
  console.log("OK:", message);
}

function warn(message) {
  console.log("WARN:", message);
}

function fail(message) {
  console.log("FAIL:", message);
  failed = true;
}

if (!exists(indexPath)) fail("Missing index.html");
if (!exists(scriptPath)) fail("Missing script.js");
if (!exists(cssPath)) fail("Missing hc-report.css");

if (failed) {
  process.exit(1);
}

const indexText = readText(indexPath);
const scriptText = readText(scriptPath);

const methodCalls = collectMatches(indexText, /v-on:[a-zA-Z-]+="([A-Za-z0-9_$.]+)(?:\(|")/g, 1)
  .concat(collectMatches(indexText, /@(?:click|change|input|submit)="([A-Za-z0-9_$.]+)(?:\(|")/g, 1))
  .filter(Boolean)
  .map(function(name) { return name.split(".")[0]; });

const missingMethods = methodCalls.filter(function(name) {
  return !hasPattern(scriptText, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*function\\s*\\("));
});

if (missingMethods.length === 0) {
  ok("All Vue event handlers from index.html exist in script.js");
} else {
  fail("Missing handler methods in script.js: " + unique(missingMethods).join(", "));
}

const models = collectMatches(indexText, /v-model="([^"]+)"/g, 1)
  .filter(function(name) { return name.indexOf(".") === -1; });

const missingModels = models.filter(function(name) {
  return !hasPattern(scriptText, new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b\\s*:"));
});

if (missingModels.length === 0) {
  ok("All v-model bindings are declared in script.js");
} else {
  fail("Missing v-model fields in script.js: " + unique(missingModels).join(", "));
}

const filterLooksPresent =
  indexText.includes("warehouseOptions") ||
  indexText.includes("groupOptions") ||
  indexText.includes("select class=\"form-control\"");

if (filterLooksPresent) {
  if (scriptText.includes("warehouseOptions") && scriptText.includes("groupOptions")) {
    ok("Filter option collections are present");
  } else {
    fail("Filter UI exists but option collections are missing");
  }

  if (scriptText.includes("option.title") || scriptText.includes("title:")) {
    ok("Filter titles are represented in script.js");
  } else {
    fail("No title mapping found for filter options");
  }

  if (scriptText.includes("warehouseValue") && scriptText.includes("groupValue")) {
    ok("Filter ids are represented in script.js");
  } else {
    fail("No id/value fields found for filters");
  }

  const queryUsesIds =
    scriptText.includes("formatDslLiteral(this.warehouseValue)") &&
    scriptText.includes("formatDslLiteral(this.groupValue)");

  if (queryUsesIds) {
    ok("Datasource expression uses selected filter ids");
  } else {
    fail("Datasource expression does not clearly use selected filter ids");
  }
}

if (scriptText.includes("executeDatasourceRequest") && scriptText.includes("/api/v1/datasource/execute/")) {
  ok("HubCloud datasource execution pattern found");
} else {
  warn("HubCloud datasource execution pattern not found");
}

if (scriptText.includes("applyDimensionRights: true")) {
  ok("applyDimensionRights enabled");
} else {
  warn("applyDimensionRights not found");
}

if (failed) {
  console.log("\nFAIL: factory lint found issues.");
  process.exit(1);
}

console.log("\nPASS: factory lint is green.");
