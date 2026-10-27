import { test, expect } from "@playwright/test";

test("admin edits a snack, its catalog photo and three prices together", async ({
  page,
}) => {
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Administración" })
    .getByRole("button", { name: "Catálogo de bocaditos", exact: true })
    .click();
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", {
        name: "Empanaditas de carne",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("Empanaditas de carne revisadas");
  await page
    .getByLabel("Fotografía del bocadito", { exact: true })
    .fill("/media/snacks/empanaditas-de-carne.webp");
  await page
    .getByLabel("Descripción del bocadito", { exact: true })
    .fill("Descripción actualizada desde administración.");
  for (const [units, price] of [
    [25, "41.50"],
    [50, "79.00"],
    [100, "150.00"],
  ]) {
    await page
      .getByLabel(`Precio ${units} unidades (S/)`, { exact: true })
      .fill(String(price));
    await page
      .getByLabel(`Publicar precio de ${units} unidades`, { exact: true })
      .check();
  }
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("cell", {
      name: "Empanaditas de carne revisadas",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/#/bocaditos");
  const card = page
    .locator(".snack-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Empanaditas de carne revisadas",
        exact: true,
      }),
    });
  await expect(card).toContainText("S/ 41.50");
  await expect(card).toContainText("S/ 79.00");
  await expect(card).toContainText("S/ 150.00");
  const image = card.locator("img");
  await expect(image).toHaveAttribute(
    "src",
    "/media/snacks/empanaditas-de-carne.webp",
  );
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(100);
  await card.getByRole("button", { name: /Ver detalles de/ }).click();
  await expect(page.locator(".snack-detail-page")).toContainText(
    "Descripción actualizada desde administración.",
  );
});
