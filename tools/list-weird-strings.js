const fs = require("fs");

const src = fs.readFileSync("script.js", "utf8");
const re = /"([^"\n]*[РС][^"\n]*)"/g;
const out = new Set();
let m;
while ((m = re.exec(src)) !== null) {
  const value = m[1];
  if (/[A-Za-zА-Яа-яЁё_ ]/.test(value)) {
    out.add(value);
  }
}

for (const item of [...out].sort()) {
  console.log(item);
}
