import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSitemap } from "./sitemap.js";
import { readJson } from "./utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const site = readJson(path.join(root, "seo-engine/config/site.json"));
const urls = buildSitemap(root, site.baseUrl);
console.log(`Sitemap updated with ${urls.length} URLs.`);
