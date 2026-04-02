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

function writeUtf8(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
}

function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").trim();
}

function getLastExecutableLine(dsText) {
  const lines = normalizeText(dsText).split("\n");
  for (let i = lines.length - 1; i >= 0; --i) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//")) {
      continue;
    }
    return line;
  }
  return "";
}

function extractScriptExpression(scriptText) {
  const source = String(scriptText || "");
  const directMatch = source.match(
    /getDatasourceExpression:\s*function\s*\(\)\s*\{\s*return\s*`([\s\S]*?)`;\s*\}/
  );
  if (directMatch) {
    return normalizeText(directMatch[1]);
  }

  const proxyMatch = source.match(
    /getDatasourceExpression:\s*function\s*\(\)\s*\{\s*return\s*this\.getDsMainExpression\(\)\s*;\s*\}/
  );
  if (proxyMatch) {
    const mainMatch = source.match(
      /getDsMainExpression:\s*function\s*\(\)\s*\{\s*return\s*\[([\s\S]*?)\]\.join\('\\n'\);\s*\}/
    );
    if (mainMatch) {
      const rows = [];
      const rowRegex = /"([\s\S]*?)"/g;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(mainMatch[1])) !== null) {
        rows.push(rowMatch[1].replace(/\\n/g, "\n"));
      }
      return normalizeText(rows.join("\n"));
    }
  }

  return "";
}

function parseFilterBlocks(filtersText) {
  const text = normalizeText(filtersText);
  if (!text) {
    return [];
  }

  const fenced = [];
  const fencedRegex = /```dsl\s*\n([\s\S]*?)```/gi;
  let match;
  while ((match = fencedRegex.exec(text)) !== null) {
    const body = normalizeText(match[1]);
    if (body) {
      fenced.push({ name: "filter_" + (fenced.length + 1), dsl: body });
    }
  }

  if (fenced.length > 0) {
    return fenced;
  }

  const sections = text.split(/^##\s*filter\s*:\s*/gim);
  if (sections.length > 1) {
    const blocks = [];
    for (let i = 1; i < sections.length; ++i) {
      const part = sections[i];
      const firstBreak = part.indexOf("\n");
      const name = (firstBreak >= 0 ? part.slice(0, firstBreak) : part).trim() || ("filter_" + i);
      const body = normalizeText(firstBreak >= 0 ? part.slice(firstBreak + 1) : "");
      if (body) {
        blocks.push({ name, dsl: body });
      }
    }
    return blocks;
  }

  return [{ name: "filter_1", dsl: text }];
}

function renderCatalog(mainDs, filterBlocks) {
  const lines = [];
  lines.push("# DS Catalog");
  lines.push("");
  lines.push("Автогенерируемый каталог запросов на основе `DS.txt` и `DS_FILTERS.txt`.");
  lines.push("Редактировать вручную не обязательно.");
  lines.push("");
  lines.push("## Block: main_query");
  lines.push("- Target: report.main");
  lines.push("- Status: active");
  lines.push("- Applies-To: script.getDatasourceExpression");
  lines.push("- Owner: user+agent");
  lines.push("");
  lines.push("```dsl");
  lines.push(mainDs);
  lines.push("```");
  lines.push("");

  for (let i = 0; i < filterBlocks.length; ++i) {
    const block = filterBlocks[i];
    lines.push("## Block: " + block.name);
    lines.push("- Target: filter." + block.name + ".options");
    lines.push("- Status: active");
    lines.push("- Applies-To: script.loadHubCloudFilters");
    lines.push("- Owner: user+agent");
    lines.push("");
    lines.push("```dsl");
    lines.push(block.dsl);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function run() {
  const root = process.cwd();
  const dsPath = path.join(root, "DS.txt");
  const dsFiltersPath = path.join(root, "DS_FILTERS.txt");
  const dsCatalogPath = path.join(root, "DS_CATALOG.md");
  const scriptPath = path.join(root, "script.js");

  let hasError = false;

  console.log("HC DS Check");
  console.log("===========");

  const dsText = readUtf8(dsPath);
  if (dsText === null) {
    hasError = true;
    console.log("ERROR: missing DS.txt (main query is required)");
  } else {
    console.log("OK: DS.txt exists");
  }

  const filtersText = readUtf8(dsFiltersPath);
  if (filtersText === null) {
    console.log("WARN: DS_FILTERS.txt not found (no filter queries declared)");
  } else {
    console.log("OK: DS_FILTERS.txt exists");
  }

  const scriptText = readUtf8(scriptPath);
  if (scriptText === null) {
    hasError = true;
    console.log("ERROR: missing script.js");
  } else {
    console.log("OK: script.js exists");
  }

  if (hasError) {
    console.log("\nFAILED: fix DS issues before transfer.");
    process.exitCode = 1;
    return;
  }

  const dsNormalized = normalizeText(dsText);
  const lastMainLine = getLastExecutableLine(dsNormalized);
  if (lastMainLine && /;\s*$/.test(lastMainLine)) {
    hasError = true;
    console.log("ERROR: final executable line in DS.txt ends with ';' (forbidden).");
    console.log("Last line:", lastMainLine);
  } else {
    console.log("OK: final executable line in DS.txt has no trailing ';'.");
  }

  const filterBlocks = parseFilterBlocks(filtersText || "");
  if (filterBlocks.length === 0) {
    console.log("WARN: no filter blocks parsed from DS_FILTERS.txt");
  } else {
    console.log("OK: parsed filter blocks:", filterBlocks.length);
    for (const block of filterBlocks) {
      const lastFilterLine = getLastExecutableLine(block.dsl);
      if (lastFilterLine && /;\s*$/.test(lastFilterLine)) {
        hasError = true;
        console.log("ERROR: final executable line in filter block '" + block.name + "' ends with ';'.");
      }
    }
  }

  const scriptExpression = extractScriptExpression(scriptText || "");
  if (!scriptExpression) {
    console.log("WARN: getDatasourceExpression() not found in script.js (template mode).");
  } else if (scriptExpression !== dsNormalized) {
    hasError = true;
    console.log("ERROR: getDatasourceExpression() in script.js differs from DS.txt");
  } else {
    console.log("OK: getDatasourceExpression() matches DS.txt.");
  }

  const hasBrokenNumericRegex = /\/\^\-\?\\\\d\+\(\?:\\\\\.\\\\d\+\)\?\$\/\.test\(str\)/.test(scriptText || "");
  if (hasBrokenNumericRegex) {
    hasError = true;
    console.log("ERROR: script.js has broken numeric regex in formatDslLiteral (\\\\d in regex literal).");
    console.log("Fix required: use /^-?\\d+(?:\\.\\d+)?$/ so numeric IDs are not quoted.");
  } else {
    console.log("OK: numeric literal regex guard in script.js looks valid.");
  }

  const hasDslTypeGuard = /sanitizeDslNumericLiterals\s*:\s*function\s*\(/.test(scriptText || "");
  if (!hasDslTypeGuard) {
    console.log("WARN: DSL numeric type guard not found in script.js (recommended).");
  } else {
    console.log("OK: DSL numeric type guard is present in script.js.");
  }

  const hasUnresolvedPlaceholderGuard = /findUnresolvedDsPlaceholders\s*:\s*function\s*\(/.test(scriptText || "");
  if (!hasUnresolvedPlaceholderGuard) {
    console.log("WARN: unresolved '&parameter' DS guard not found in script.js (recommended).");
  } else {
    console.log("OK: unresolved '&parameter' DS guard is present in script.js.");
  }

  const generatedCatalog = renderCatalog(dsNormalized, filterBlocks);
  writeUtf8(dsCatalogPath, generatedCatalog);
  console.log("OK: DS_CATALOG.md synchronized from DS.txt + DS_FILTERS.txt");

  if (hasError) {
    console.log("\nFAILED: fix DS issues before transfer.");
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: DS checks are green.");
}

run();
