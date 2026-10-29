import { test, expect } from "@playwright/test";

test("visual review covers every storefront route from small phones to ultrawide", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["", "tortas", "bocaditos", "arma-tu-mesa", "personaliza", "nosotros", "contacto"]) {
    await page.goto(`/#/${route}`);
    if (route === "tortas") await expect(page.locator(".work-card")).toHaveCount(6);
    if (route === "bocaditos") await expect(page.locator(".snack-card")).toHaveCount(31);
    await expect(page.locator("main")).toBeVisible();
    for (const width of [320, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `${route || "inicio"} at ${width}px` }).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/design-${route || "inicio"}-${width}.png`, fullPage: !["bocaditos"].includes(route), animations: "disabled" });
    }
  }
  await page.goto("/#/tortas");
  await page.getByRole("button", { name: "Ver fotos de Torta de Sonic y Shadow", exact: true }).click();
  await page.screenshot({ path: "test-results/design-cake-dialog.png" });
  await page.getByRole("dialog").getByRole("button", { name: "Quiero una torta similar" }).click();
  await page.setViewportSize({ width: 360, height: 844 });
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: "test-results/design-quote-dialog-mobile.png" });
  expect(errors).toEqual([]);
});

test("visual review visits every administrative module without changing data", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/admin");
  await page.screenshot({ path: "test-results/design-login.png" });
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  const navigation = page.getByRole("navigation", { name: "Administración", exact: true });
  await expect(navigation).toBeVisible();
  const names = await navigation.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")!));
  for (const [index, name] of names.entries()) {
    await navigation.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".workspace-loading")).toHaveCount(0);
    await expect(page.locator(".admin-content").getByRole("heading").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBeLessThanOrEqual(1440);
    if (["Inicio", "Productos", "Kardex", "Configuración", "Preparación del negocio"].includes(name)) await page.screenshot({ path: `test-results/design-admin-${index}.png`, fullPage: true });
  }
  await navigation.getByRole("button", { name: "Productos", exact: true }).click();
  await page.getByRole("button", { name: "+ Nuevo registro", exact: true }).click();
  await expect(page.locator(".admin-form-card")).toBeVisible();
  await page.screenshot({ path: "test-results/design-admin-product-form.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: "test-results/design-admin-product-form-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Abrir menú administrativo", exact: true }).click();
  await navigation.getByRole("button", { name: "Inicio", exact: true }).click();
  await page.setViewportSize({ width: 360, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: "test-results/design-admin-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
