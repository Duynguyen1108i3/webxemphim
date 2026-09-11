import { describe, expect, it } from "vitest";
import { decodeHtml } from "./htmlUtils";

describe("decodeHtml", () => {
  it("decodes basic HTML entities properly", () => {
    expect(decodeHtml("&quot;Hello &amp; World&quot;")).toBe('"Hello & World"');
  });

  it("handles empty or falsy text gracefully", () => {
    expect(decodeHtml("")).toBe("");
  });
});
