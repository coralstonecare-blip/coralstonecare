# Coral Stone Care SEO Engine

This folder is isolated from the public site and can be moved to a dedicated repository later. It selects a topic, generates a reviewed HTML article and hero image, injects internal links, updates the blog index and sitemap, and records publication state.

## Safety defaults

- `npm run seo:daily` creates a review package unless `SEO_AUTO_PUBLISH=true` or `--publish` is passed.
- Missing credentials fail visibly; secrets are never stored in the repository.
- A deterministic quality gate and anti-spam checks must score at least 70 before an article can publish.
- Cluster rotation prevents more than three consecutive posts in the same cluster.
- Images retry once and then fail the run loudly.

## Setup

1. Copy `.env.example` to `.env.local` and fill credentials locally.
2. Add the same values as GitHub Actions secrets for cloud scheduling.
3. Run `npm test` and `npm run seo:validate`.
4. Run `npm run seo:daily:review` and inspect `seo-engine/review/`.
5. Publish only after review with `npm run seo:daily:publish`.

The Windows scheduler installer is `scripts/install-local-crons.ps1`. Local tasks are disabled automatically when required credentials are missing.
