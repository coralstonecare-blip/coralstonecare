import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSitemap } from "../src/sitemap.js";

test("builds clean URLs and excludes the engine", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coral-sitemap-"));
  fs.mkdirSync(path.join(root, "blog", "guide"), { recursive: true });
  fs.mkdirSync(path.join(root, "seo-engine"), { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), "home");
  fs.writeFileSync(path.join(root, "services.html"), "services");
  fs.writeFileSync(path.join(root, "blog", "guide", "index.html"), "guide");
  fs.writeFileSync(path.join(root, "seo-engine", "private.html"), "private");
  const urls = buildSitemap(root, "https://example.com");
  assert.deepEqual(urls.map((item) => item.route), ["/", "/blog/guide", "/services"]);
  assert.ok(!fs.readFileSync(path.join(root, "sitemap.xml"), "utf8").includes("private"));
});
