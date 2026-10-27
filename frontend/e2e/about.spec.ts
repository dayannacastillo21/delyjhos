import { test, expect } from "@playwright/test";

test("about page shows real work, fits responsive screens and opens a quote", async ({ page }) => {
  await page.goto("/#/nosotros");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Detrás de cada torta,una historia para celebrar.");
  await expect(page.locator("#inicio")).toHaveCount(0);
  const images = page.locator(".about-photo-composition img");
  await expect(images).toHaveCount(2);
  await expect.poll(() => images.evaluateAll(elements => elements.every(el => (el as HTMLImageElement).naturalWidth > 0))).toBe(true);
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/about-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Cuéntanos tu idea" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
