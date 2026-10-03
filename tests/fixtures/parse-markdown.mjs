import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { markdown } from "../../src/core/markdown.ts";
let result;
try {
  result = markdown(JSON.parse(readFileSync(0, "utf8")));
} catch (error) {
  assert.ok(error instanceof Error);
  assert.match(
    error.message,
    /Unsupported|Unclosed|Invalid|Unsafe|body line|Images must|Inconsistent|Editorial blocks|URI malformed|URL encoding/,
  );
  console.log(JSON.stringify({ kind: "rejected", message: error.message }));
  process.exit(0);
}
assert.equal(typeof result.html, "string");
assert.equal(typeof result.text, "string");
assert.ok(Array.isArray(result.headings));
console.log(JSON.stringify({ kind: "rendered", ...result }));
