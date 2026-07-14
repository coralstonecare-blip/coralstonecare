import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addInternalLinks, renderArticlePage, renderBlogCard, scoreArticle, updateBlogIndex, validateArticle, writePublishedArticle } from "./content.js";
import { hasGscConfig, queryOpportunities } from "./gsc.js";
import { generateArticle, generateHeroImage } from "./openai.js";
import { selectOpportunity } from "./rotation.js";
import { buildSitemap } from "./sitemap.js";
import { annotation, bool, isoDate, loadEnvFile, readJson, slugify, writeJson } from "./utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(path.join(root, ".env.local"));

const site = readJson(path.join(root, "seo-engine/config/site.json"));
const clusters = readJson(path.join(root, "seo-engine/config/clusters.json"));
const evergreen = readJson(path.join(root, "seo-engine/config/evergreen-keywords.json"));
const stateFile = path.join(root, "seo-engine/data/autopost_state.json");
const state = readJson(stateFile);
const requestedPublish = process.argv.includes("--publish") || bool(process.env.SEO_AUTO_PUBLISH);
const reviewOnly = process.argv.includes("--review") || !requestedPublish;

async function candidates() {
  if (hasGscConfig()) {
    try {
      const rows = await queryOpportunities();
      if (rows.length) return rows;
      annotation("notice", "GSC opportunity selection", "No queries matched the 5-20 position and impression filters; using evergreen backlog.");
    } catch (error) {
      annotation("warning", "Search Console fallback", error.message);
    }
  } else {
    annotation("warning", "Search Console not configured", "Using the curated evergreen backlog until GSC OAuth secrets are added.");
  }
  return evergreen.map((item) => ({ ...item, source: "evergreen", impressions: 0, position: 99 }));
}

async function main() {
  const opportunity = selectOpportunity({
    candidates: await candidates(),
    clusters,
    state,
    forbiddenIntents: site.forbiddenIntents,
    maximum: site.maxSameClusterInARow
  });
  if (!opportunity) {
    state.lastRun = { date: new Date().toISOString(), status: "no-opportunity" };
    writeJson(stateFile, state);
    console.log("No eligible keyword was available. This is a normal no-op run.");
    process.exitCode = 2;
    return;
  }

  const cluster = clusters.find((item) => item.id === opportunity.cluster);
  console.log(`Selected cluster=${cluster.id} keyword="${opportunity.keyword}" source=${opportunity.source}`);
  const article = await generateArticle({ site, cluster, opportunity });
  article.slug = slugify(article.slug || article.title);
  article.html = addInternalLinks(article.html, cluster, state);
  const issues = validateArticle(article, site);
  const quality = scoreArticle(article, opportunity, site);
  const date = isoDate();

  if (issues.length || quality.score < site.minimumQualityScore) {
    const rejected = {
      date,
      keyword: opportunity.keyword,
      cluster: cluster.id,
      slug: article.slug,
      status: "rejected",
      issues,
      quality,
      article
    };
    writeJson(path.join(root, "seo-engine/review", `${article.slug}.json`), rejected);
    state.drafts.push({ keyword: opportunity.keyword, cluster: cluster.id, slug: article.slug, date, score: quality.score, status: "rejected" });
    state.lastRun = { date: new Date().toISOString(), status: "rejected", slug: article.slug, score: quality.score };
    writeJson(stateFile, state);
    annotation("warning", "Article rejected by quality gate", `${article.slug} scored ${quality.score}; ${issues.join("; ") || "minimum score not met"}`);
    return;
  }

  const image = await generateHeroImage({ title: article.title, heroAlt: article.heroAlt, cluster });
  const heroPath = `/images/blog/featured-${article.slug}.png`;
  const html = renderArticlePage({ site, cluster, opportunity, article, date, heroPath });
  const card = renderBlogCard({ cluster, article, date, heroPath });

  if (reviewOnly) {
    const reviewDir = path.join(root, "seo-engine/review", article.slug);
    fs.mkdirSync(reviewDir, { recursive: true });
    fs.writeFileSync(path.join(reviewDir, "index.html"), html, "utf8");
    fs.writeFileSync(path.join(reviewDir, `featured-${article.slug}.png`), image);
    writeJson(path.join(reviewDir, "review.json"), { date, opportunity, cluster: cluster.id, article, quality, publishCommand: "npm run seo:daily:publish" });
    state.drafts.push({ keyword: opportunity.keyword, cluster: cluster.id, slug: article.slug, date, score: quality.score, status: "review" });
    state.lastRun = { date: new Date().toISOString(), status: "review", slug: article.slug, score: quality.score };
    writeJson(stateFile, state);
    console.log(`Review package created at seo-engine/review/${article.slug}`);
    return;
  }

  writePublishedArticle(root, { article, html, image });
  updateBlogIndex(path.join(root, "blog/index.html"), card, article.slug);
  buildSitemap(root, site.baseUrl);
  state.published.push({ keyword: opportunity.keyword, cluster: cluster.id, slug: article.slug, date, score: quality.score });
  state.clusterHistory.push(cluster.id);
  state.clusterHistory = state.clusterHistory.slice(-20);
  state.lastRun = { date: new Date().toISOString(), status: "published", slug: article.slug, score: quality.score };
  writeJson(stateFile, state);
  console.log(`Published /blog/${article.slug} with quality score ${quality.score}.`);
}

main().catch((error) => {
  annotation("error", "Daily SEO job failed", error.stack || error.message);
  process.exitCode = 1;
});
