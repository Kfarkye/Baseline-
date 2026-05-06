import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function absolutePath(relativePath: string): string {
  return path.join(ROOT, relativePath);
}

function exists(relativePath: string): boolean {
  return fs.existsSync(absolutePath(relativePath));
}

function read(relativePath: string): string {
  return fs.readFileSync(absolutePath(relativePath), "utf8");
}

function requireExists(relativePath: string): void {
  assert.ok(exists(relativePath), `${relativePath} must exist`);
}

function requireIncludes(text: string, pattern: string | RegExp, message: string): void {
  if (pattern instanceof RegExp) {
    assert.ok(pattern.test(text), message);
    return;
  }
  assert.ok(text.includes(pattern), message);
}

function requireExcludes(text: string, pattern: RegExp, message: string): void {
  assert.ok(!pattern.test(text), message);
}

const manifestPath = "public/manifest.webmanifest";
const serviceWorkerPath = "public/service-worker.js";
const appleTouchIconPath = "public/icons/apple-touch-icon.png";
const cssPath = "src/index.css";
const indexHtmlPath = "index.html";

requireExists(manifestPath);
requireExists(serviceWorkerPath);
requireExists(appleTouchIconPath);
requireExists(cssPath);
requireExists(indexHtmlPath);

const manifest = JSON.parse(read(manifestPath));
assert.equal(manifest.name, "Baseline", "manifest name must be Baseline");
assert.equal(manifest.short_name, "Baseline", "manifest short_name must be Baseline");
assert.equal(manifest.start_url, "/", "manifest start_url must be /");
assert.equal(manifest.display, "standalone", "manifest display must be standalone");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "manifest icons must exist");
assert.ok(
  manifest.icons.some((icon: { sizes?: string }) => icon.sizes === "192x192"),
  "manifest must include a 192x192 icon"
);
assert.ok(
  manifest.icons.some((icon: { sizes?: string }) => icon.sizes === "512x512"),
  "manifest must include a 512x512 icon"
);
assert.ok(
  manifest.icons.some((icon: { purpose?: string }) => String(icon.purpose || "").includes("maskable")),
  "manifest must include a maskable icon"
);

for (const icon of manifest.icons as Array<{ src?: string }>) {
  assert.ok(icon.src, "every manifest icon must include src");
  const normalized = String(icon.src).replace(/^\//, "");
  requireExists(`public/${normalized}`);
}

const indexHtml = read(indexHtmlPath);
requireIncludes(indexHtml, /<link[^>]+rel=["']manifest["'][^>]*>/i, "index.html must link a manifest");
requireIncludes(indexHtml, /viewport-fit\s*=\s*cover/i, "index.html must include viewport-fit=cover");
requireIncludes(indexHtml, /name=["']mobile-web-app-capable["']/i, "index.html must include mobile-web-app-capable");
requireIncludes(indexHtml, /name=["']apple-mobile-web-app-capable["']/i, "index.html must include apple-mobile-web-app-capable");
requireIncludes(indexHtml, /name=["']apple-mobile-web-app-title["']/i, "index.html must include apple-mobile-web-app-title");
requireIncludes(indexHtml, /name=["']apple-mobile-web-app-status-bar-style["']/i, "index.html must include apple-mobile-web-app-status-bar-style");
requireIncludes(indexHtml, /rel=["']apple-touch-icon["']/i, "index.html must include apple-touch-icon");

const swText = read(serviceWorkerPath);
for (const blockedPath of ["/api/odds", "/api/chat", "/api/stream/odds", "/mcp"]) {
  requireIncludes(swText, blockedPath, `service worker must explicitly bypass ${blockedPath}`);
}
for (const blockedHost of ["api.stripe.com", "checkout.stripe.com", "securetoken.googleapis.com", "identitytoolkit.googleapis.com"]) {
  requireIncludes(swText, blockedHost, `service worker must explicitly bypass ${blockedHost}`);
}
requireIncludes(swText, /isNetworkOnlyRequest/, "service worker must include network-only route guards");

const consumerTextTargets = [
  "src/App.tsx",
  "src/components/PricingView.tsx",
  "index.html",
  "public/offline.html",
];
for (const target of consumerTextTargets) {
  const text = read(target);
  requireExcludes(text, /The Odds API/i, `${target} must not contain The Odds API consumer copy`);
  requireExcludes(text, /synthetic odds/i, `${target} must not contain synthetic odds consumer copy`);
}

const cssText = read(cssPath);
requireIncludes(cssText, /safe-area-inset-top/i, "src/index.css must include safe-area inset handling");
requireIncludes(cssText, /\.safe-area-bottom/i, "src/index.css must include safe-area utility classes");

console.log("check:app-shell passed");
