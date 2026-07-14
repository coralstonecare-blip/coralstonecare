const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://searchconsole.googleapis.com/webmasters/v3";

export function hasGscConfig(env = process.env) {
  return Boolean(env.GSC_CLIENT_ID && env.GSC_CLIENT_SECRET && env.GSC_REFRESH_TOKEN && env.GSC_SITE_URL);
}

export async function refreshAccessToken(env = process.env) {
  if (!hasGscConfig(env)) throw new Error("Search Console OAuth credentials are incomplete");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GSC_CLIENT_ID,
      client_secret: env.GSC_CLIENT_SECRET,
      refresh_token: env.GSC_REFRESH_TOKEN,
      grant_type: "refresh_token"
    }),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`Search Console token refresh failed (${response.status}): ${payload.error_description || payload.error || "unknown error"}`);
  }
  return payload.access_token;
}

export async function queryOpportunities(env = process.env) {
  const token = await refreshAccessToken(env);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const site = encodeURIComponent(env.GSC_SITE_URL);
  const response = await fetch(`${API_ROOT}/sites/${site}/searchAnalytics/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      dimensions: ["query"],
      rowLimit: 500,
      dataState: "final"
    }),
    signal: AbortSignal.timeout(45000)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Search Console query failed (${response.status}): ${payload.error?.message || "unknown error"}`);
  return (payload.rows || [])
    .map((row) => ({
      keyword: row.keys?.[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 99,
      source: "gsc"
    }))
    .filter((row) => row.keyword && row.impressions >= 10 && row.position >= 5 && row.position <= 20);
}
