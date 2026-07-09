import { describe, expect, it } from "vitest";
import { recommendationScore } from "@streamforge/utils";

describe("recommendationScore", () => {
  it("weights genre and completion as primary signals", () => {
    const score = recommendationScore({ genreAffinity: 1, completionRate: 1, ratingAffinity: 0.5, freshnessBoost: 0, popularityBoost: 0 });
    expect(score).toBe(0.7);
  });
});
