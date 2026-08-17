/**
 * Resource links on lesson blocks.
 *
 * Storage: resources live inside the block's JSONB `content` under the
 * `resources` key, so no migration is needed and blocks without resources
 * keep working unchanged.
 */

export interface BlockResource {
  title: string;
  url: string;
}

export type ResourceProvider = "youtube" | "web";

export interface ResourcePreviewInfo {
  provider: ResourceProvider;
  title: string;
  url: string;
  domain: string;
  /** YouTube only. */
  videoId?: string;
  thumbnailUrl?: string;
  /** Neutral type label, e.g. "YouTube" / "iBog" / "Eksternt materiale". */
  sourceLabel: string;
}

export const INVALID_URL_MESSAGE = "Indtast et gyldigt link.";

/** Only plain http(s) web links are allowed — never javascript:, data:, etc. */
export function isSafeUrl(raw: string): boolean {
  return parseSafeUrl(raw) !== null;
}

export function parseSafeUrl(raw: string): URL | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  return url;
}

export function domainOf(raw: string): string {
  const url = parseSafeUrl(raw);
  if (!url) return "";
  return url.hostname.replace(/^www\./, "");
}

/** Extracts a YouTube video id from the common URL formats. */
export function youtubeVideoId(raw: string): string | null {
  const url = parseSafeUrl(raw);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const id = (value: string | null | undefined) =>
    value && /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : null;

  if (host === "youtu.be") return id(url.pathname.split("/").filter(Boolean)[0]);
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") return id(url.searchParams.get("v"));
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      return id(parts[1] ?? null);
    }
  }
  return null;
}

const IBOG_DOMAINS = ["systime.dk", "ibog.systime.dk", "restudy.dk", "gyldendal.dk"];

function sourceLabelFor(domain: string, provider: ResourceProvider): string {
  if (provider === "youtube") return "YouTube";
  if (IBOG_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return "iBog";
  return domain || "Eksternt materiale";
}

/**
 * Defensive, purely client-side preview detection. Never scrapes, never calls
 * an external service — if detection fails we still return a usable card.
 */
export function resourcePreview(resource: BlockResource): ResourcePreviewInfo | null {
  const url = parseSafeUrl(resource.url);
  if (!url) return null;
  const domain = url.hostname.replace(/^www\./, "");
  const videoId = youtubeVideoId(resource.url);
  const title = resource.title?.trim() || domain;

  if (videoId) {
    return {
      provider: "youtube",
      title,
      url: url.toString(),
      domain,
      videoId,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      sourceLabel: "YouTube",
    };
  }

  return {
    provider: "web",
    title,
    url: url.toString(),
    domain,
    sourceLabel: sourceLabelFor(domain, "web"),
  };
}

/** Reads resources out of a block's content, ignoring anything malformed. */
export function readResources(content: unknown): BlockResource[] {
  const raw = (content as Record<string, unknown> | null | undefined)?.["resources"];
  return normalizeResources(raw);
}

export function normalizeResources(raw: unknown): BlockResource[] {
  if (!Array.isArray(raw)) return [];
  const out: BlockResource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const url = typeof record["url"] === "string" ? record["url"].trim() : "";
    if (!isSafeUrl(url)) continue;
    const title = typeof record["title"] === "string" ? record["title"].trim() : "";
    out.push({ title: title || domainOf(url), url });
  }
  return out;
}

/** Writes resources back into a content object (removing the key when empty). */
export function withResources(
  content: Record<string, unknown>,
  resources: BlockResource[],
): Record<string, unknown> {
  const next = { ...content };
  const clean = resources
    .map((r) => ({ title: (r.title ?? "").trim(), url: (r.url ?? "").trim() }))
    .filter((r) => isSafeUrl(r.url))
    .map((r) => ({ title: r.title || domainOf(r.url), url: r.url }));
  if (clean.length) next["resources"] = clean;
  else delete next["resources"];
  return next;
}
