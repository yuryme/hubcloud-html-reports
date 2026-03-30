const fs = require("fs");
const path = require("path");

const files = {
  index: path.resolve("index.html"),
  script: path.resolve("script.js")
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function checkEncoding(name, text) {
  const bad = /(?:[РС][\u0400-\u045F\u00A0-\u00FF]){2,}/g.test(text);
  return bad
    ? [`ERROR: ${name}: possible mojibake detected (pattern Р?/С?).`]
    : [`OK: ${name}: no obvious mojibake pattern.`];
}

function checkIndex(indexText) {
  const out = [];
  if (/{{[\s\S]*?}}/.test(indexText)) {
    out.push("ERROR: index.html: found moustache {{...}}. Use v-text in HubCloud.");
  } else {
    out.push("OK: index.html: no moustache interpolation.");
  }

  const riskyPatterns = [
    { re: /<b-table\b/i, msg: "ERROR: index.html: <b-table> found. Prefer plain <table>." },
    { re: /v-slot[:=]/i, msg: "ERROR: index.html: v-slot found." },
    { re: /#cell\(/i, msg: "ERROR: index.html: #cell(...) shorthand slot found." },
    { re: /slot-scope=/i, msg: "WARN: index.html: slot-scope found (legacy slots can be brittle)." }
  ];

  for (const item of riskyPatterns) {
    if (item.re.test(indexText)) out.push(item.msg);
  }

  if (!riskyPatterns.some(x => x.re.test(indexText))) {
    out.push("OK: index.html: no risky slot/table constructs detected.");
  }
  return out;
}

function checkScript(scriptText) {
  const out = [];
  const detectModeMatch = scriptText.match(/detectDataSourceMode:\s*function\(\)\s*{([\s\S]*?)^\s*},/m);
  const detectModeBody = detectModeMatch ? detectModeMatch[1] : "";
  if (!detectModeBody) {
    out.push("WARN: script.js: detectDataSourceMode block not found.");
  } else if (/return\s+["']mock["']\s*;\s*$/.test(detectModeBody.trim())) {
    out.push("WARN: script.js: detectDataSourceMode final default is mock.");
  } else if (/return\s+["']hubcloud["']\s*;\s*$/.test(detectModeBody.trim())) {
    out.push("OK: script.js: detectDataSourceMode final default is hubcloud.");
  } else {
    out.push("WARN: script.js: detectDataSourceMode final default could not be recognized.");
  }

  if (/dataSourceMode:\s*["']hubcloud["']/.test(scriptText)) {
    out.push("OK: script.js: initial dataSourceMode is hubcloud.");
  } else {
    out.push("WARN: script.js: initial dataSourceMode is not explicitly hubcloud.");
  }

  if (/isWating/.test(scriptText)) {
    out.push("WARN: script.js: typo isWating detected.");
  } else {
    out.push("OK: script.js: no isWating typo.");
  }

  const hasSinglePipeInKey3If = /if\s*\([^)]*key3[^)]*(?<!\|)\|(?!\|)[^)]*\)/.test(scriptText);
  if (hasSinglePipeInKey3If) {
    out.push("WARN: script.js: bitwise | used in column checks. Prefer ||.");
  } else {
    out.push("OK: script.js: no risky bitwise OR in column checks.");
  }

  return out;
}

const indexText = read(files.index);
const scriptText = read(files.script);

const report = [
  "HubCloud Compatibility Check",
  "===========================",
  ...checkEncoding("index.html", indexText),
  ...checkEncoding("script.js", scriptText),
  ...checkIndex(indexText),
  ...checkScript(scriptText)
];

for (const line of report) {
  console.log(line);
}

const hasError = report.some(line => line.startsWith("ERROR:"));
process.exit(hasError ? 2 : 0);
