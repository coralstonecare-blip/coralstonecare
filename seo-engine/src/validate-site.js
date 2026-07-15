import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { annotation } from "./utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "seo-engine"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function expectedFile(href) {
  const clean = href.split(/[?#]/)[0];
  if (clean === "/") return path.join(root, "index.html");
  const direct = path.join(root, `${clean.slice(1)}.html`);
  if (fs.existsSync(direct)) return direct;
  return path.join(root, clean.slice(1), "index.html");
}

const failures = [];
const canonicals = new Map();
for (const file of walk(root)) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const requirement of [
    [/<title>[^<]+<\/title>/i, "title"],
    [/<meta[^>]+name=["']description["']/i, "description"],
    [/<link[^>]+rel=["']canonical["']/i, "canonical"],
    [/application\/ld\+json/i, "structured data"]
  ]) {
    if (!requirement[0].test(html)) failures.push(`${relative}: missing ${requirement[1]}`);
  }
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (canonical) {
    if (canonicals.has(canonical)) failures.push(`${relative}: duplicate canonical also used by ${canonicals.get(canonical)}`);
    canonicals.set(canonical, relative);
  }
  for (const match of html.matchAll(/href=["'](\/[^"'#]+)["']/g)) {
    if (/\.(png|jpe?g|webp|css|js|xml|txt)$/i.test(match[1])) continue;
    if (!fs.existsSync(expectedFile(match[1]))) failures.push(`${relative}: broken internal link ${match[1]}`);
  }
}

for (const required of ["robots.txt", "sitemap.xml", "site-config.js", "tracking.js"]) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`missing ${required}`);
}

if (failures.length) {
  failures.forEach((failure) => annotation("error", "SEO validation", failure));
  process.exitCode = 1;
} else {
  console.log(`SEO validation passed for ${canonicals.size} HTML pages.`);
}
