import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasGscConfig, queryOpportunities } from "./gsc.js";
import { annotation, isoDate, loadEnvFile, writeJson } from "./utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(path.join(root, ".env.local"));

async function main() {
  const report = { generatedAt: new Date().toISOString(), period: "28 days", status: "ok", opportunities: [] };
  if (!hasGscConfig()) {
    report.status = "not-configured";
    report.message = "Search Console OAuth credentials are required for live keyword reporting.";
    annotation("warning", "Weekly report skipped", report.message);
  } else {
    report.opportunities = (await queryOpportunities()).slice(0, 50);
    report.summary = {
      opportunityCount: report.opportunities.length,
      impressions: report.opportunities.reduce((sum, item) => sum + item.impressions, 0),
      clicks: report.opportunities.reduce((sum, item) => sum + item.clicks, 0)
    };
  }
  const file = path.join(root, "seo-engine/reports", `keyword-report-${isoDate()}.json`);
  writeJson(file, report);
  console.log(`Weekly report written to ${path.relative(root, file)}.`);
}

main().catch((error) => {
  annotation("error", "Weekly SEO report failed", error.stack || error.message);
  process.exitCode = 1;
});
