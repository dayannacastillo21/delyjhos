import { test, expect } from "@playwright/test";

test("home presents real creations and working discovery paths at every size", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hay momentos");
  await expect(page.locator(".home-hero-photo img")).toHaveAttribute("src", /work-01\/detail-1.webp$/);
  await expect(page.locator(".product-card")).toHaveCount(0);
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 950 });
    await page.locator(".home-family-note").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect.poll(() => page.locator(".home-page img").evaluateAll(images => images.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: `test-results/premium-home-${width}.png`, fullPage: true, animations: "disabled" });
  }
  await page.locator(".home-discover-card").nth(2).click();
  await expect(page).toHaveURL(/#\/arma-tu-mesa$/);
  await page.goto("/");
  await page.locator("#inicio").getByRole("button", { name: "Personaliza tu torta", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
