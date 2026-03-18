import { test, expect } from "@playwright/test";
test("jobs.tolarai.com branding/ui", async ({ page }) => {
  await page.goto("https://jobs.tolarai.com");
  await expect(page.locator("img[alt='WantokJobs']")).toBeVisible();
  await expect(page.locator("body")).toContainText("WantokJobs");
  await expect(page.locator("#jean-widget")).toBeVisible();
});
