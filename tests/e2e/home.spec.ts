import { test, expect } from "@playwright/test";

test("home page renders premium navigation", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await expect(page.getByText("STREAMFORGE")).toBeVisible();
  await expect(page.getByRole("link", { name: "Search" })).toBeVisible();
});
