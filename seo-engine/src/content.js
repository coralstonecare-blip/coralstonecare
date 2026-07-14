import fs from "node:fs";
import path from "node:path";
import { escapeHtml, slugify, stripHtml, wordCount, writeFileAtomic } from "./utils.js";

export function addInternalLinks(html, cluster, state) {
  const publicationCount = (state.published || []).length;
  const links = (cluster.moneyPages || []).slice(0, 4).map((page, index) => {
    const anchors = page.anchors || [page.url];
    return { url: page.url, anchor: anchors[(publicationCount + index) % anchors.length] };
  });
  if (!links.length) return html;
  const items = links.map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.anchor)}</a></li>`).join("");
  return `${html}\n<section><h2>Related stone care services</h2><ul>${items}</ul></section>`;
}

export function validateArticle(article, site) {
  const issues = [];
  if (!article || typeof article !== "object") return ["article payload is missing"];
  if (!article.title || article.title.length < 25 || article.title.length > 75) issues.push("title must be 25-75 characters");
  if (!article.description || article.description.length < 110 || article.description.length > 165) issues.push("description must be 110-165 characters");
  if (!article.slug || slugify(article.slug) !== article.slug) issues.push("slug must be lowercase and hyphenated");
  if (!article.excerpt || article.excerpt.length < 60 || article.excerpt.length > 240) issues.push("excerpt must be 60-240 characters");
  if (!article.heroAlt || article.heroAlt.length < 20 || article.heroAlt.length > 180) issues.push("heroAlt must be 20-180 characters");
  if (!article.html || !/<h2[\s>]/i.test(article.html)) issues.push("article must contain h2 sections");
  if (/<h1[\s>]/i.test(article.html)) issues.push("article body must not contain h1");
  if (/<(script|style|iframe|form|object|embed)[\s>]/i.test(article.html)) issues.push("article contains a forbidden HTML element");
  if (/https?:\/\//i.test(article.html)) issues.push("article body must not contain external URLs");
  for (const intent of site.forbiddenIntents || []) {
    if (`${article.title} ${article.description} ${stripHtml(article.html)}`.toLowerCase().includes(intent.toLowerCase())) {
      issues.push(`forbidden supplier intent: ${intent}`);
    }
  }
  return issues;
}

export function scoreArticle(article, opportunity, site) {
  const text = stripHtml(article.html).toLowerCase();
  const words = wordCount(article.html);
  const phrase = opportunity.keyword.toLowerCase();
  const phraseCount = text.split(phrase).length - 1;
  const phraseWords = phrase.split(/\s+/).length;
  const density = words ? (phraseCount * phraseWords * 100) / words : 0;
  const headings = (article.html.match(/<h2[\s>]/gi) || []).length;
  const subheadings = (article.html.match(/<h3[\s>]/gi) || []).length;
  const internalLinks = (article.html.match(/href="\//gi) || []).length;
  const spamPatterns = [
    /guaranteed results?/i,
    /number one/i,
    /best company/i,
    /miracle/i,
    /100%/i,
    /according to studies/i,
    /industry-leading/i,
    /unbeatable/i
  ];
  const spamHits = spamPatterns.filter((pattern) => pattern.test(`${article.title} ${text}`)).map(String);

  const checks = [
    { name: "title", points: article.title.length >= 35 && article.title.length <= 65 ? 10 : 5 },
    { name: "description", points: article.description.length >= 120 && article.description.length <= 160 ? 10 : 5 },
    { name: "word-count", points: words >= site.minimumWords && words <= site.maximumWords ? 20 : words >= 650 ? 10 : 0 },
    { name: "sections", points: headings >= 4 ? 10 : headings >= 2 ? 5 : 0 },
    { name: "faqs", points: subheadings >= 2 ? 5 : 0 },
    { name: "keyword-use", points: phraseCount >= 1 ? 10 : 0 },
    { name: "keyword-density", points: density > 0 && density <= 2.5 ? 10 : density <= 3.5 ? 4 : 0 },
    { name: "internal-links", points: internalLinks >= 2 && internalLinks <= 4 ? 10 : internalLinks === 1 ? 5 : 0 },
    { name: "local-relevance", points: /miami|south florida|humidity|salt air|rain|uv/i.test(text) ? 5 : 0 },
    { name: "anti-spam", points: spamHits.length === 0 ? 10 : 0 }
  ];
  return {
    score: checks.reduce((sum, check) => sum + check.points, 0),
    checks,
    metrics: { words, headings, subheadings, internalLinks, phraseCount, keywordDensity: Number(density.toFixed(2)) },
    spamHits
  };
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderArticlePage({ site, cluster, opportunity, article, date, heroPath }) {
  const url = `${site.baseUrl}/blog/${article.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: date,
    dateModified: date,
    mainEntityOfPage: url,
    image: `${site.baseUrl}${heroPath}`,
    author: { "@type": "Organization", name: site.name },
    publisher: { "@id": `${site.baseUrl}/#business` },
    about: cluster.label,
    keywords: opportunity.keyword
  };
  return `<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>${escapeHtml(article.title)}</title>
<meta name="description" content="${escapeHtml(article.description)}"/><meta name="robots" content="index,follow,max-image-preview:large"/>
<link rel="canonical" href="${escapeHtml(url)}"/>
<meta property="og:type" content="article"/><meta property="og:site_name" content="${escapeHtml(site.name)}"/><meta property="og:title" content="${escapeHtml(article.title)}"/>
<meta property="og:description" content="${escapeHtml(article.description)}"/><meta property="og:url" content="${escapeHtml(url)}"/><meta property="og:image" content="${escapeHtml(`${site.baseUrl}${heroPath}`)}"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="theme-color" content="#2C3537"/>
<script type="application/ld+json">${safeJson(schema)}</script>
<link href="https://fonts.googleapis.com" rel="preconnect"/><link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@400;700&amp;family=Open+Sans:wght@400;600;700&amp;family=Work+Sans:wght@600&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=typography"></script><script>tailwind.config={theme:{extend:{colors:{primary:'#2C3537',secondary:'#2E7775',sand:'#EBE1D2',surface:'#f8f9fa'},fontFamily:{display:['Libre Caslon Text'],body:['Open Sans'],label:['Work Sans']}}}}</script>
<script src="/site-config.js"></script><script defer src="/tracking.js"></script>
</head><body class="bg-surface text-primary font-body antialiased">
<header class="bg-white/95 sticky top-0 z-50 shadow-sm"><div class="max-w-6xl mx-auto px-5 md:px-10 py-4 flex items-center justify-between gap-6"><a href="/" aria-label="Coral Stone Care home"><img src="/images/logo.png" alt="Coral Stone Care" class="h-16 w-auto"/></a><nav class="hidden md:flex gap-6 text-sm"><a href="/services" class="hover:text-secondary">Services</a><a href="/restoration" class="hover:text-secondary">Restoration</a><a href="/exterior" class="hover:text-secondary">Exterior Areas</a><a href="/blog" class="text-secondary font-semibold">Guides</a></nav><a href="/contact" class="bg-secondary text-white px-5 py-3 rounded text-sm font-semibold">Request a Quote</a></div></header>
<main><article><header class="bg-primary text-white py-16"><div class="max-w-4xl mx-auto px-5 md:px-10"><p class="font-label uppercase tracking-widest text-sand text-sm mb-5"><a href="/blog" class="hover:underline">Stone Care Guides</a> · ${escapeHtml(date)}</p><h1 class="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">${escapeHtml(article.title)}</h1><p class="text-xl text-white/80">${escapeHtml(article.excerpt)}</p></div></header>
<div class="max-w-4xl mx-auto px-5 md:px-10 py-12"><img src="${escapeHtml(heroPath)}" alt="${escapeHtml(article.heroAlt)}" class="w-full max-h-[520px] object-cover rounded-xl mb-12"/><div class="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-primary prose-a:text-secondary prose-a:font-semibold">${article.html}<section class="not-prose bg-sand rounded-xl p-8 my-12"><h2 class="font-display text-3xl font-bold mb-4">Get a condition-based recommendation</h2><p class="text-gray-700 mb-6">Send photos and a short description of the surface. We serve Miami and surrounding communities.</p><a href="/contact" class="inline-block bg-primary text-white px-7 py-4 rounded font-semibold">Request a Free Quote</a></section></div></div></article></main>
<footer class="bg-primary text-white py-12"><div class="max-w-6xl mx-auto px-5 md:px-10 flex flex-col md:flex-row justify-between gap-8"><div><p class="font-display text-2xl mb-2">Coral Stone Care</p><p class="text-white/70">Miami, Florida · <a href="tel:+17862578858">(786) 257-8858</a></p></div><div class="flex gap-5 text-white/80"><a href="/services">Services</a><a href="/blog">Guides</a><a href="/contact">Contact</a></div></div></footer>
</body></html>`;
}

export function renderBlogCard({ cluster, article, date, heroPath }) {
  return `<article class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200"><a href="/blog/${escapeHtml(article.slug)}"><img src="${escapeHtml(heroPath)}" alt="${escapeHtml(article.heroAlt)}" class="w-full h-64 object-cover"/></a><div class="p-8"><p class="font-label text-xs uppercase tracking-widest text-secondary mb-3">${escapeHtml(cluster.label)} · ${escapeHtml(date)}</p><h2 class="font-display text-3xl font-bold mb-4"><a class="hover:text-secondary" href="/blog/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a></h2><p class="text-gray-600 mb-6">${escapeHtml(article.excerpt)}</p><a class="font-semibold text-secondary" href="/blog/${escapeHtml(article.slug)}">Read the guide →</a></div></article>`;
}

export function updateBlogIndex(file, card, slug) {
  const current = fs.readFileSync(file, "utf8");
  if (current.includes(`/blog/${slug}`)) throw new Error(`blog index already contains ${slug}`);
  const marker = "<!-- AUTO_POSTS_START -->";
  if (!current.includes(marker)) throw new Error("blog index is missing AUTO_POSTS_START marker");
  writeFileAtomic(file, current.replace(marker, `${marker}\n${card}`));
}

export function writePublishedArticle(root, { article, html, image }) {
  const page = path.join(root, "blog", article.slug, "index.html");
  const hero = path.join(root, "images", "blog", `featured-${article.slug}.png`);
  fs.mkdirSync(path.dirname(page), { recursive: true });
  fs.mkdirSync(path.dirname(hero), { recursive: true });
  fs.writeFileSync(page, html, "utf8");
  fs.writeFileSync(hero, image);
  return { page, hero };
}
