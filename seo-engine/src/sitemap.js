import fs from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "./utils.js";

function walk(directory, root, entries = []) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "seo-engine"].includes(item.name)) continue;
    const full = path.join(directory, item.name);
    if (item.isDirectory()) walk(full, root, entries);
    else if (item.isFile() && item.name.endsWith(".html")) entries.push(full);
  }
  return entries;
}

function routeFor(file, root) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"/index.html".length)}`;
  return `/${relative.slice(0, -".html".length)}`;
}

export function buildSitemap(root, baseUrl) {
  const urls = walk(root, root)
    .map((file) => ({
      route: routeFor(file, root),
      lastmod: fs.statSync(file).mtime.toISOString().slice(0, 10)
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
  const lines = urls.map(({ route, lastmod }) => `  <url><loc>${baseUrl}${route}</loc><lastmod>${lastmod}</lastmod></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`;
  writeFileAtomic(path.join(root, "sitemap.xml"), xml);
  return urls;
}
