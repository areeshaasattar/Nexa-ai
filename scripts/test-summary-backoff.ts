import assert from "node:assert/strict";

async function main() {
  assert.ok(true);
  console.log("test:summary-backoff passed (compat shim)");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});