import { test, expect } from "@playwright/test";

test("management can review operational preparation and open the relevant settings", async ({ page }) => {
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.getByRole("button", { name: "Preparación del negocio" }).click();
  await expect(page.getByRole("heading", { name: "Preparación del negocio", exact: true })).toBeVisible();
  await expect(page.locator(".readiness-checks article")).toHaveCount(5);
  await expect(page.locator(".readiness-manual li")).toHaveCount(4);
  await page.getByRole("button", { name: "Actualizar revisión" }).click();
  await expect(page.locator(".readiness-checks article")).toHaveCount(5);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/business-readiness-mobile.png", fullPage: true });
  await page.locator(".readiness-checks article").first().getByRole("button", { name: "Revisar configuración" }).click();
  await expect(page.getByLabel("WhatsApp (código de país + número, solo dígitos)")).toBeVisible();
});

