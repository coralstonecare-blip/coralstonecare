import path from "node:path";
import { fileURLToPath } from "node:url";
import { annotation, isoDate, readJson, writeJson } from "./utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const site = readJson(path.join(root, "seo-engine/config/site.json"));
const routes = ["/", "/services", "/restoration", "/exterior", "/commercial", "/contact", "/blog", "/robots.txt", "/sitemap.xml"];

async function inspect(route) {
  const url = `${site.baseUrl}${route}`;
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    const html = (response.headers.get("content-type") || "").includes("text/html");
    return {
      route,
      url: response.url,
      status: response.status,
      contentType: response.headers.get("content-type"),
      title: html ? body.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null : null,
      canonical: html ? body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || null : null,
      hasDescription: html ? /<meta[^>]+name=["']description["']/i.test(body) : null,
      hasStructuredData: html ? /application\/ld\+json/i.test(body) : null,
      bytes: Buffer.byteLength(body)
    };
  } catch (error) {
    return { route, url, status: 0, error: error.message };
  }
}

async function main() {
  const results = [];
  for (const route of routes) results.push(await inspect(route));
  const failures = results.filter((item) => item.status !== 200 || (item.contentType?.includes("text/html") && (!item.canonical || !item.hasDescription)));
  const report = { generatedAt: new Date().toISOString(), site: site.baseUrl, results, failures };
  const file = path.join(root, "seo-engine/reports", `production-audit-${isoDate()}.json`);
  writeJson(file, report);
  if (failures.length) annotation("error", "Production SEO audit found failures", failures.map((item) => `${item.route}:${item.status}`).join(", "));
  else console.log("Production SEO audit passed.");
  process.exitCode = failures.length ? 1 : 0;
}

main().catch((error) => {
  annotation("error", "Production audit crashed", error.stack || error.message);
  process.exitCode = 1;
});
