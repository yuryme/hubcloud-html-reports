const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DEFAULT_EXTENSIONS = [".html", ".js", ".json", ".md", ".css", ".txt"];
const IGNORE_DIRS = new Set([".git", "node_modules", "Microsoft"]);
const IGNORE_FILES = new Set([
  "tools/encoding-dryrun.js",
  "tools/fix-script-garbled.js",
  "tools/list-weird-strings.js"
]);

const onlyPatterns = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith("--only="))
  .map((arg) => arg.slice("--only=".length))
  .filter(Boolean);

function listFilesRecursive(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      out.push(...listFilesRecursive(full));
      continue;
    }
    out.push(full);
  }
  return out;
}

function isTargetFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return DEFAULT_EXTENSIONS.includes(ext);
}

function matchesOnly(filePath) {
  if (!onlyPatterns.length) return true;
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return onlyPatterns.some((pattern) => rel.includes(pattern));
}

function isIgnoredFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return IGNORE_FILES.has(rel);
}

function findIssues(content) {
  const issues = [];

  // Invalid UTF-8 decode marker.
  if (content.includes("\uFFFD")) {
    issues.push("contains U+FFFD replacement chars (likely invalid UTF-8 bytes)");
  }

  // Typical mojibake fingerprints from cp1251/utf8 mismatch.
  const mojibakePattern = /(?:[РС][\u0400-\u045F\u00A0-\u00FF]){2,}/g;
  const matches = content.match(mojibakePattern);
  if (matches && matches.length) {
    const sample = [...new Set(matches)].slice(0, 3).join(", ");
    issues.push(`possible mojibake pattern (${sample})`);
  }

  const latinUtf8MojibakePattern = /(?:Ð.|Ñ.){2,}/g;
  const latinMatches = content.match(latinUtf8MojibakePattern);
  if (latinMatches && latinMatches.length) {
    const sample = [...new Set(latinMatches)].slice(0, 3).join(", ");
    issues.push(`possible UTF-8/Latin mojibake pattern (${sample})`);
  }

  return issues;
}

const allFiles = listFilesRecursive(ROOT)
  .filter(isTargetFile)
  .filter((f) => !isIgnoredFile(f))
  .filter(matchesOnly)
  .sort();

const report = [];
let errors = 0;

for (const file of allFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const issues = findIssues(content);

  if (!issues.length) {
    report.push(`OK: ${rel}`);
    continue;
  }

  errors++;
  for (const issue of issues) {
    report.push(`ERROR: ${rel}: ${issue}`);
  }
}

console.log("Encoding Guard");
console.log("==============");
for (const line of report) {
  console.log(line);
}
console.log(`Checked files: ${allFiles.length}`);
console.log(`Errors: ${errors}`);

process.exit(errors > 0 ? 2 : 0);
