import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = ["index.html", "styles.css", "demo.css", "app.js", "demo-api.js", ".nojekyll"];
requiredFiles.forEach(file => assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`));

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(index, /PUBLIC DEMO/);
assert.match(index, /\.\/demo-api\.js/);
assert.doesNotMatch(index, /(?:href|src)="\//);

const publishableText = ["index.html", "styles.css", "demo.css", "app.js", "demo-api.js", "README.md"]
  .map(file => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");
const prohibited = [
  new RegExp(["gen", "ale"].join(""), "i"),
  new RegExp(["da", "wa"].join(""), "i"),
  new RegExp(`\\b${["g", "d", "3"].join("")}\\b`, "i"),
  new RegExp(["Ethiopian", "Electric", "Power"].join("\\s+"), "i"),
  /passwordHash/i,
  /smtp_pass/i,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /admin@hydro\.local/i,
  /C:\\Users\\EEP/i,
  /your-app-password/i
];
prohibited.forEach(pattern => assert.doesNotMatch(publishableText, pattern));

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  key(index) { return Array.from(this.values.keys())[index] || null; }
  get length() { return this.values.size; }
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
const location = { href: "https://example.github.io/hydro-omms-demo/", reload() {} };
const document = { addEventListener() {} };
const originalFetch = async () => new Response("Not found", { status: 404 });
const window = { fetch: originalFetch, location };
const context = vm.createContext({
  window, localStorage, sessionStorage, location, document,
  Response, URL, Date, Math, JSON, Object, Array, String, Number, Boolean,
  console, setTimeout, clearTimeout
});

vm.runInContext(fs.readFileSync(path.join(root, "demo-api.js"), "utf8"), context, { filename: "demo-api.js" });
assert.equal(sessionStorage.getItem("cmms.authToken"), "hydro-public-demo-token");

const bootstrapResponse = await window.fetch("/api/bootstrap");
assert.equal(bootstrapResponse.status, 200);
const bootstrap = await bootstrapResponse.json();
assert.equal(bootstrap.currentUser.role, "System Administrator");
assert.ok(bootstrap.assets.length >= 8);
assert.ok(bootstrap.workOrders.length >= 4);
assert.ok(Object.keys(bootstrap.productionMeterReadings).length >= 14);
assert.ok(Object.keys(bootstrap.waterLevelSheets).length >= 1);

const createResponse = await window.fetch("/api/work-orders", {
  method: "POST",
  body: JSON.stringify({ title: "Verification work order", assetId: "asset-u1", priority: "Low" })
});
assert.equal(createResponse.status, 201);
const afterCreate = await (await window.fetch("/api/bootstrap")).json();
assert.equal(afterCreate.workOrders.length, bootstrap.workOrders.length + 1);

console.log(`Demo verification passed: ${afterCreate.assets.length} assets, ${afterCreate.workOrders.length} work orders, ${Object.keys(afterCreate.productionMeterReadings).length} production days.`);
