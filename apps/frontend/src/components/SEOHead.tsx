import { useEffect } from "react";
import type { NormalizedMovie } from "../lib/movieApi";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "video.movie" | "video.tv_show" | "article";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_SITE_NAME = "RytoxGroup";
const DEFAULT_TITLE = "RytoxGroup — Xem Phim, Phim Bộ & Anime 4K Vietsub Trực Tuyến";
const DEFAULT_DESCRIPTION =
  "RytoxGroup — Nền tảng xem phim điện ảnh, phim bộ truyền hình và Anime chất lượng cao 4K Ultra HD, phụ đề Vietsub & thuyết minh mượt mà.";
const DEFAULT_KEYWORDS =
  "RytoxGroup, xem phim online, phim 4K, phim bộ, phim lẻ, anime vietsub, phim chiếu rạp, phim mới cập nhật, streaming HLS";
const DEFAULT_OG_IMAGE = "/favicon.jpg";

function upsertMetaTag(attrName: "name" | "property", attrValue: string, content: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonicalLink(href: string) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function buildWebsiteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: DEFAULT_SITE_NAME,
        url: origin,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "vi-VN",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${origin}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: DEFAULT_SITE_NAME,
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/favicon.jpg`,
        },
      },
    ],
  };
}

export function buildMovieJsonLd(movie: NormalizedMovie, origin: string) {
  const isSeries = movie.mediaType === "tv" || (movie.seasons && movie.seasons.length > 0);
  const schemaType = isSeries ? "TVSeries" : "Movie";
  const url = `${origin}/?m=${encodeURIComponent(movie.slug || movie.id)}`;
  const ratingValue = movie.averageRating && movie.averageRating > 0 ? movie.averageRating : 8.5;

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: movie.title,
    url,
    image: [movie.posterUrl, movie.backdropUrl].filter(Boolean),
    description:
      movie.synopsis ||
      movie.description ||
      `Xem phim ${movie.title} (${movie.releaseYear || 2026}) chất lượng Full HD / 4K Vietsub trên RytoxGroup.`,
    datePublished: movie.releaseYear ? `${movie.releaseYear}-01-01` : undefined,
    genre: movie.genres?.map((g) => g.name) || undefined,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue.toFixed(1)),
      bestRating: 10,
      worstRating: 1,
      ratingCount: 120,
    },
    potentialAction: {
      "@type": "WatchAction",
      target: `${origin}/?v=${encodeURIComponent(movie.slug || movie.id)}`,
    },
  };
}

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noindex = false,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const origin = window.location.origin;
    const fullTitle = title
      ? title.includes(DEFAULT_SITE_NAME)
        ? title
        : `${title} | ${DEFAULT_SITE_NAME}`
      : DEFAULT_TITLE;
    const canonicalUrl = `${origin}${canonicalPath ?? window.location.pathname}`;
    const resolvedImage = ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`;

    document.title = fullTitle;

    // Standard Meta Tags
    upsertMetaTag("name", "description", description);
    upsertMetaTag("name", "keywords", keywords);
    upsertMetaTag(
      "name",
      "robots",
      noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );

    // Canonical URL
    upsertCanonicalLink(canonicalUrl);

    // Open Graph Tags
    upsertMetaTag("property", "og:site_name", DEFAULT_SITE_NAME);
    upsertMetaTag("property", "og:locale", "vi_VN");
    upsertMetaTag("property", "og:type", ogType);
    upsertMetaTag("property", "og:title", fullTitle);
    upsertMetaTag("property", "og:description", description);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("property", "og:image", resolvedImage);

    // Twitter Card Tags
    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", fullTitle);
    upsertMetaTag("name", "twitter:description", description);
    upsertMetaTag("name", "twitter:image", resolvedImage);

    // JSON-LD Structured Data (Schema.org)
    const scriptId = "rytox-seo-jsonld";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!noindex) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      const schemaPayload = jsonLd || buildWebsiteJsonLd(origin);
      scriptEl.textContent = JSON.stringify(schemaPayload);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, keywords, canonicalPath, ogImage, ogType, noindex, jsonLd]);

  return null;
}
