"use strict";

const { spawnSync } = require("child_process");

const steps = [
  { title: "Encoding guard", cmd: ["node", "tools/encoding-guard.js"] },
  { title: "Transfer check", cmd: ["node", "tools/hc-transfer-check.js"] }
];

function runStep(step) {
  console.log("");
  console.log(`== ${step.title} ==`);
  const [command, ...args] = step.cmd;
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  return result.status === 0;
}

console.log("HubCloud Encoding Gate");
console.log("=====================");

for (const step of steps) {
  const ok = runStep(step);
  if (!ok) {
    console.log("");
    console.log(`FAILED: ${step.title}`);
    process.exit(2);
  }
}

console.log("");
console.log("PASS: encoding gate is green.");
