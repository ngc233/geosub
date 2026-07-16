import "server-only";

const MIN_OFFICIAL_ICON_SCORE = 600;
const OFFICIAL_SITE_TIMEOUT_MS = 12_000;

function getHtmlAttribute(tag: string, attributeName: string) {
  const match = tag.match(
    new RegExp(`${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[2] || match?.[3] || match?.[4] || null;
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function getOfficialIconScore(tag: string) {
  const rel = getHtmlAttribute(tag, "rel")?.toLowerCase() || "";
  const href = getHtmlAttribute(tag, "href")?.toLowerCase() || "";
  const type = getHtmlAttribute(tag, "type")?.toLowerCase() || "";
  const sizes = getHtmlAttribute(tag, "sizes")?.toLowerCase() || "";

  if (!rel.includes("icon")) {
    return -1;
  }

  let score = 0;
  if (href.endsWith(".svg") || type.includes("svg")) score += 1000;
  if (href.endsWith(".png") || type.includes("png")) score += 700;
  if (rel.includes("apple-touch-icon")) score += 500;
  if (href.includes("favicon")) score -= 150;

  const sizeMatches = Array.from(sizes.matchAll(/(\d+)x(\d+)/g));
  for (const match of sizeMatches) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      score += Math.min(width, height);
    }
  }

  if (sizes === "any") score += 256;

  return score;
}

export async function fetchOfficialSiteIcon(officialUrl: string | null) {
  if (!officialUrl) {
    return null;
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(officialUrl);
  } catch {
    return null;
  }

  if (siteUrl.protocol !== "https:" && siteUrl.protocol !== "http:") {
    return null;
  }

  const response = await fetch(siteUrl.toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "GeoSubAdmin/1.0 (+https://geosub.org)",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(OFFICIAL_SITE_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const finalUrl = response.url || siteUrl.toString();
  const iconCandidates = linkTags
    .map((tag) => {
      const href = getHtmlAttribute(tag, "href");
      const absoluteUrl = href ? toAbsoluteUrl(href, finalUrl) : null;

      return {
        url: absoluteUrl,
        score: getOfficialIconScore(tag),
      };
    })
    .filter(
      (candidate) =>
        candidate.url &&
        !candidate.url.startsWith("data:") &&
        candidate.score >= MIN_OFFICIAL_ICON_SCORE,
    )
    .sort((a, b) => b.score - a.score);

  return iconCandidates[0]?.url || null;
}
