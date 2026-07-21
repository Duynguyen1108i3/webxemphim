export function decodeHtml(text: string): string {
  if (!text) return "";
  try {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return doc.documentElement.textContent || text;
  } catch (e) {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
}
