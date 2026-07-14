import test from "node:test";
import assert from "node:assert/strict";
import { addInternalLinks, scoreArticle, validateArticle } from "../src/content.js";

const site = {
  minimumWords: 850,
  maximumWords: 1600,
  forbiddenIntents: ["buy coral stone"]
};
const cluster = {
  moneyPages: [
    { url: "/services", anchors: ["stone cleaning services"] },
    { url: "/contact", anchors: ["request a quote"] }
  ]
};

function longBody() {
  const paragraph = "Miami humidity, rain, shade, drainage, and salt air can change how natural stone absorbs moisture. A careful inspection and a small test area help determine a compatible cleaning and maintenance approach without making universal product claims.";
  return `<h2>Understand the surface</h2><p>coral stone cleaning in Miami requires a condition-based plan. ${paragraph}</p><h2>Inspect exposure</h2><p>${paragraph.repeat(8)}</p><h2>Choose a safe process</h2><p>${paragraph.repeat(8)}</p><h2>Plan maintenance</h2><p>${paragraph.repeat(8)}</p><h3>How often should it be inspected?</h3><p>${paragraph}</p><h3>Why test first?</h3><p>${paragraph}</p>`;
}

test("adds no more than four deterministic internal links", () => {
  const html = addInternalLinks(longBody(), cluster, { published: [] });
  assert.equal((html.match(/href="\//g) || []).length, 2);
});

test("quality gate rewards useful structure without spam", () => {
  const html = addInternalLinks(longBody(), cluster, { published: [] });
  const article = {
    title: "A Safe Coral Stone Cleaning Plan for Miami Homes",
    description: "Learn how exposure, drainage, humidity, and surface condition shape a safer coral stone cleaning and maintenance plan for Miami properties.",
    slug: "safe-coral-stone-cleaning-miami",
    excerpt: "A practical, condition-based approach to cleaning and maintaining porous natural stone in South Florida.",
    heroAlt: "Clean coral stone patio beside a Miami home in natural daylight",
    html
  };
  assert.deepEqual(validateArticle(article, site), []);
  assert.ok(scoreArticle(article, { keyword: "coral stone cleaning in Miami" }, site).score >= 70);
});

test("rejects unsafe markup and supplier intent", () => {
  const article = {
    title: "Where to Buy Coral Stone at the Best Price in Miami",
    description: "A sufficiently long description about where to buy coral stone products and wholesale materials in Miami for residential projects today.",
    slug: "buy-coral-stone-miami",
    excerpt: "A long enough excerpt about wholesale natural stone products and supplier options in Miami for a construction project.",
    heroAlt: "Stacks of stone products prepared for wholesale sale in Miami",
    html: "<h2>Buy</h2><script>alert(1)</script><p>buy coral stone</p>"
  };
  assert.ok(validateArticle(article, site).length >= 2);
});
