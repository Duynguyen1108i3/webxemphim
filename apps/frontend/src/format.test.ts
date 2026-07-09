import { describe, expect, it } from "vitest";
import { formatRuntime } from "@streamforge/utils";

describe("formatRuntime", () => {
  it("formats feature-length runtimes", () => {
    expect(formatRuntime(134)).toBe("2h 14m");
  });
});
