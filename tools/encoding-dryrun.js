const fs = require("fs");
const path = require("path");

const files = ["script.js", "sandbox.html", "index.html", "LOCAL_DEV.md"];
const dec1251 = new TextDecoder("windows-1251");
const cp1251Map = new Map();

for (let b = 0; b < 256; b++) {
  const ch = dec1251.decode(Uint8Array.from([b]));
  if (!cp1251Map.has(ch)) {
    cp1251Map.set(ch, b);
  }
}

function decodeCp1251AsUtf8(segment) {
  const bytes = [];
  for (const ch of segment) {
    const byte = cp1251Map.get(ch);
    if (byte === undefined) {
      return null;
    }
    bytes.push(byte);
  }
  return Buffer.from(bytes).toString("utf8");
}

function weirdScore(value) {
  let score = 0;
  for (const ch of value) {
    if (ch === "\uFFFD") {
      score += 3;
      continue;
    }
    if (/[A-Za-z0-9 \t\r\n.,:;!?(){}\[\]<>\/\\'"`~@#$%^*_=+|-]/.test(ch)) {
      continue;
    }
    if (/[А-Яа-яЁё]/.test(ch)) {
      continue;
    }
    score += 1;
  }
  return score;
}

function maybeFix(text) {
  let fixes = 0;
  let current = text;
  let changed = true;

  // Common mojibake pair pattern: Р?.С?.Р?...
  const pairPattern = /(?:[РС][\u0400-\u045F\u00A0-\u00FF]){2,}/g;

  while (changed) {
    changed = false;
    current = current.replace(pairPattern, (segment) => {
      const decoded = decodeCp1251AsUtf8(segment);
      if (!decoded || decoded === segment) {
        return segment;
      }
      if (!/[А-Яа-яЁё]/.test(decoded)) {
        return segment;
      }
      if (decoded.includes("\uFFFD")) {
        return segment;
      }
      if (weirdScore(decoded) > weirdScore(segment)) {
        return segment;
      }
      fixes++;
      changed = true;
      return decoded;
    });
  }

  return { out: current, fixes };
}

const shouldWrite = process.argv.includes("--write");

for (const file of files) {
  const full = path.resolve(file);
  const src = fs.readFileSync(full, "utf8");
  const result = maybeFix(src);
  console.log(`${file}: fixes=${result.fixes}`);
  if (shouldWrite && result.fixes > 0) {
    fs.writeFileSync(full, result.out, "utf8");
  }
}
