import { describe, expect, it } from "vitest";
import { updateAvatarSchema } from "../src/schemas/user.schema.js";

describe("updateAvatarSchema", () => {
  it("validates Pinterest image URL successfully", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl: "https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg"
    });
    expect(result.success).toBe(true);
  });

  it("validates compressed base64 data URL successfully", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD..."
    });
    expect(result.success).toBe(true);
  });

  it("fails on empty string", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl: ""
    });
    expect(result.success).toBe(false);
  });
});
