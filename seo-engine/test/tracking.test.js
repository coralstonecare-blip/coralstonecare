import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const trackingSource = fs.readFileSync(path.join(root, "tracking.js"), "utf8");

function runTracking(pathname, search) {
  const appended = [];
  const storage = new Map();
  class FakeElement {}
  const document = {
    querySelector: () => null,
    createElement: (tagName) => ({ tagName, dataset: {}, style: {}, appendChild: () => {} }),
    head: { appendChild: (element) => appended.push(element) },
    body: { prepend: () => {} },
    addEventListener: () => {}
  };
  const window = {
    CORAL_STONE_CARE_CONFIG: { gtmId: "", ga4Id: "G-C8E9SE4Y6C", clarityId: "xmkjq2dtua" },
    location: { pathname, search },
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    }
  };

  vm.runInNewContext(trackingSource, { window, document, URLSearchParams, Date, Element: FakeElement });
  return {
    appended,
    commands: window.dataLayer.map((entry) => Array.from(entry))
  };
}

test("loads GA4 and records a successful ads landing lead", () => {
  const result = runTracking("/thank-you", "?submitted=1&source=google-ads");
  assert.ok(result.appended.some((item) => item.src === "https://www.googletagmanager.com/gtag/js?id=G-C8E9SE4Y6C"));
  const lead = result.commands.find((command) => command[0] === "event" && command[1] === "generate_lead");
  assert.equal(lead?.[2]?.method, "quote_form");
  assert.equal(lead?.[2]?.form_location, "google_ads_landing");
});

test("does not record a lead on a direct thank-you page visit", () => {
  const result = runTracking("/thank-you", "");
  assert.equal(result.commands.some((command) => command[0] === "event" && command[1] === "generate_lead"), false);
});
