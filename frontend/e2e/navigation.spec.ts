import { test, expect } from "@playwright/test";

test("storefront navigation opens separate views and supports history and refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("#inicio")).toBeVisible();
  await expect(page.locator("#bocaditos")).toHaveCount(0);
  await expect(page.locator("#nuestros-trabajos")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/redesign-home-desktop.png",
    fullPage: true,
  });
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("link", { name: "Tortas", exact: true }).click();
  await expect(page).toHaveURL(/#\/tortas$/);
  await expect(
    page.getByRole("heading", { name: "Tortas para celebrar" }),
  ).toBeVisible();
  await expect(page.locator("#inicio")).toHaveCount(0);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tortas para celebrar" }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Bocaditos", exact: true }).click();
  await expect(page.locator("#bocaditos")).toBeVisible();
  await expect(page.locator("#productos")).toHaveCount(0);
  await expect(page.locator(".snack-quote-form")).toHaveCount(0);
  await nav
    .getByRole("link", { name: "Nuestros trabajos", exact: true })
    .click();
  await expect(page.locator(".work-card")).toHaveCount(6);
  const height = await page
    .locator(".work-poster")
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(280);
  await page.screenshot({
    path: "test-results/redesign-works-desktop.png",
    fullPage: true,
  });
  await page.goBack();
  await expect(page.locator("#bocaditos")).toBeVisible();
  await nav.getByRole("link", { name: "Arma tu mesa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Arma tu mesa de bocaditos" }),
  ).toBeVisible();
  await expect(page.locator(".snack-quote-form")).toHaveCount(0);
  await nav
    .getByRole("link", { name: "Personaliza tu torta", exact: true })
    .click();
  await expect(page.locator(".standalone-form")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await nav.getByRole("link", { name: "Nosotros", exact: true }).click();
  await expect(page.locator("#nosotros")).toBeVisible();
  await expect(page.locator("#contacto")).toHaveCount(0);
  await nav.getByRole("link", { name: "Contacto", exact: true }).click();
  await expect(page.locator("#contacto")).toBeVisible();
});

test("all storefront pages fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "",
    "tortas",
    "bocaditos",
    "arma-tu-mesa",
    "nuestros-trabajos",
    "personaliza",
    "nosotros",
    "contacto",
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    if (!route)
      await page.screenshot({
        path: "test-results/redesign-home-mobile.png",
        fullPage: true,
      });
  }
});
