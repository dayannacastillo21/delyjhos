import { test, expect } from "@playwright/test";

test("cakes catalog displays real work photos and quotes the selected creation", async ({ page }) => {
  await page.goto("/#/tortas");
  await expect(page.getByRole("heading", { name: "Nuestras tortas", exact: true })).toBeVisible();
  await expect(page.locator(".real-cake-catalog .work-card")).toHaveCount(6);
  await expect(page.locator(".product-card")).toHaveCount(0);
  const photos = page.locator(".real-cake-catalog .work-poster img");
  await expect.poll(() => photos.evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await photos.evaluateAll(images => images.every(image => (image as HTMLImageElement).src.includes("/media/works/")))).toBe(true);
  await page.getByRole("searchbox", { name: "Buscar nuestras tortas" }).fill("Sonic");
  await expect(page.locator(".work-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver fotos de Torta de Sonic y Shadow", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".work-player > img")).toBeVisible();
  await expect(dialog.locator("video")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Quiero una torta similar" }).click();
  await expect(page.getByRole("dialog").getByLabel("Temática o celebración")).toHaveValue("Torta de Sonic y Shadow");
  await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  await page.getByRole("searchbox", { name: "Buscar nuestras tortas" }).fill("");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/real-cakes-${width}.png`, fullPage: true });
  }
});
