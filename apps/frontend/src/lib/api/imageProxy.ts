import { APP_DOMAIN_CDN_IMAGE } from "../movieApiConfig";

export function createFallbackImage(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1f1f1f"/><stop offset=".55" stop-color="#111"/><stop offset="1" stop-color="#2a0d10"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="#000" opacity=".22"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    const entities: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&#39;" };
    return entities[char] ?? char;
  });
}

export function proxyImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  return url;
}

export function absolutePhim4kImageUrl(url: unknown, imageCdnUrl?: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.replace(/^\/+/, "");
  const cdnBase = typeof imageCdnUrl === "string" && /^https?:\/\//i.test(imageCdnUrl)
    ? imageCdnUrl.replace(/\/+$/, "")
    : APP_DOMAIN_CDN_IMAGE;

  return `${cdnBase}/${normalizedPath}`;
}

export function normalizePhim4kImageUrl(url: unknown, imageCdnUrl?: unknown): string {
  const absoluteUrl = absolutePhim4kImageUrl(url, imageCdnUrl);
  if (!absoluteUrl) return "";
  return proxyImageUrl(absoluteUrl);
}

export function slugify(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
