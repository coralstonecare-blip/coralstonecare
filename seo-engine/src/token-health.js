import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasGscConfig, refreshAccessToken } from "./gsc.js";
import { annotation, loadEnvFile } from "./utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(path.join(root, ".env.local"));

async function main() {
  if (!hasGscConfig()) throw new Error("Search Console OAuth credentials are not configured");
  await refreshAccessToken();
  console.log("Search Console OAuth token health check passed.");
}

main().catch((error) => {
  annotation("error", "Search Console token health failed", error.message);
  process.exitCode = 1;
});
