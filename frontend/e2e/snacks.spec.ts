import { test, expect } from "@playwright/test";

test("snack catalog filters, saves selection, submits and appears in administration", async ({
  page,
}) => {
  await page.goto("/#bocaditos");
  const catalog = page.locator("#bocaditos");
  await expect(
    catalog.getByRole("heading", {
      name: "Catálogo de bocaditos",
      exact: true,
    }),
  ).toBeVisible();
  await expect(catalog.locator(".snack-card")).toHaveCount(31);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await catalog.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.screenshot({ path: "test-results/snacks-desktop.png" });
  await catalog.getByRole("button", { name: "Dulces", exact: true }).click();
  await expect(catalog.locator(".snack-card")).toHaveCount(12);
  await catalog.getByLabel("Buscar bocaditos").fill("brownies");
  await expect(catalog.locator(".snack-card")).toHaveCount(1);
  await expect(catalog.locator(".snack-card")).not.toContainText("S/");
  await catalog
    .getByRole("button", {
      name: "Añadir 50 unidades de Mini brownies",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(page.locator("#arma-tu-mesa")).toContainText(
    "50 unidades · 1 variedades",
  );
  const form = page.locator(".snack-quote-form");
  await form.getByLabel("Nombre", { exact: true }).fill("Mesa E2E");
  await form.getByLabel("Teléfono / WhatsApp").fill("999999999");
  await form.getByLabel("Celebración").fill("Cumpleaños familiar");
  await form
    .getByLabel("Fecha", { exact: true })
    .fill(new Date(Date.now() + 172800000).toISOString().slice(0, 10));
  await form.getByLabel("Invitados").fill("15");
  await form
    .getByRole("button", { name: "Solicitar cotización de mi mesa" })
    .click();
  await expect(form.getByRole("status")).toContainText(
    "Recibimos tu propuesta",
  );
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page
    .getByRole("button", { name: "Mesas de bocaditos", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Mesa E2E", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Mini brownies");
  await expect(page.getByRole("dialog")).toContainText("Precio por revisar");
  await page.getByRole("dialog").getByRole("button", { name: /Cerrar/ }).click();
  await page.getByRole("button", { name: /Vista previa de bocaditos/ }).click();
  await expect(page.locator(".snack-card")).toHaveCount(31);
  await expect(page.getByRole("button", { name: "Solicitar cotización de mi mesa" })).toBeDisabled();
});

test("snack catalog fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#bocaditos");
  await expect(page.locator(".snack-card")).toHaveCount(31);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#bocaditos").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.screenshot({ path: "test-results/snacks-mobile.png" });
});
