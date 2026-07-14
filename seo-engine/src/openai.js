import { annotation } from "./utils.js";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const IMAGES_URL = "https://api.openai.com/v1/images/generations";

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  return process.env.OPENAI_API_KEY;
}

async function openaiRequest(url, body, timeout = 180000) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireApiKey()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${payload.error?.message || "unknown error"}`);
  return payload;
}

function responseText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI response did not contain output text");
}

export async function generateArticle({ site, cluster, opportunity }) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "slug", "excerpt", "heroAlt", "html"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      slug: { type: "string" },
      excerpt: { type: "string" },
      heroAlt: { type: "string" },
      html: { type: "string" }
    }
  };
  const prompt = `Create a people-first local service guide for ${site.name} in ${site.location}.

Primary search intent: ${opportunity.keyword}
Topic cluster: ${cluster.label}
Technical guardrails: ${cluster.technicalStandards}

Requirements:
- 900 to 1,400 words of original, practical English.
- Do not invent certifications, studies, prices, customer stories, guarantees, statistics, addresses, or product performance claims.
- Do not target product-purchase or supplier intent. This business cleans, restores, seals, and maintains existing stone.
- Mention Miami conditions only when relevant: humidity, rain, UV, salt air, shade, irrigation, pool splash, and drainage.
- The HTML is article body only: paragraphs, h2, h3, ul, ol, strong. Do not include h1, script, style, iframe, form, images, external links, or a call-to-action section.
- Use the primary phrase naturally. Avoid repetitive wording and keyword stuffing.
- End with 2 to 4 concise FAQs using h2/h3 and paragraph answers.
- Description must be 120 to 160 characters. Slug must be short, lowercase, and hyphenated.
- Hero alt text must describe a plausible real stone-care scene without promotional language.`;

  const payload = await openaiRequest(RESPONSES_URL, {
    model: process.env.SEO_TEXT_MODEL || "gpt-5.4",
    input: prompt,
    text: { format: { type: "json_schema", name: "seo_article", strict: true, schema } }
  });
  return JSON.parse(responseText(payload));
}

export async function generateHeroImage({ title, heroAlt, cluster }) {
  const prompt = `Photorealistic editorial photograph for an educational stone-care article titled "${title}". ${heroAlt}. South Florida residential or commercial architecture, natural daylight, realistic coral stone or limestone texture, professional maintenance context, no people posing, no text, no logos, no watermark, no exaggerated before-and-after split.`;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const payload = await openaiRequest(IMAGES_URL, {
        model: process.env.SEO_IMAGE_MODEL || "gpt-image-2",
        prompt,
        size: "1536x1024",
        quality: "medium",
        output_format: "png"
      }, 240000);
      const encoded = payload.data?.[0]?.b64_json;
      if (!encoded) throw new Error("image response did not contain b64_json");
      return Buffer.from(encoded, "base64");
    } catch (error) {
      lastError = error;
      annotation("warning", "Hero image retry", `${cluster.id} attempt ${attempt}: ${error.message}`);
    }
  }
  annotation("error", "Hero image failed", lastError?.message || "unknown image error");
  throw lastError;
}
