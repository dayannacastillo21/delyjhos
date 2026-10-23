import { test, expect } from "@playwright/test";

test("public catalog, real order and private tracking", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Torta de Chocolate", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver detalles", exact: true }).click();
  await page
    .getByRole("button", { name: "Añadir a mi lista para cotizar" })
    .click();
  await page
    .getByRole("button", { name: "Haz tu pedido", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu nombre", { exact: true }).fill("Cliente E2E");
  await dialog.getByLabel("Teléfono", { exact: true }).fill("999999999");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await dialog.getByLabel("Fecha solicitada").fill(tomorrow);
  await dialog
    .getByRole("button", { name: "Enviar solicitud de pedido" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: /Recibimos tu pedido/ }),
  ).toBeVisible();
  const token = await dialog.locator("code").innerText();
  await dialog.getByRole("button", { name: "Cerrar ventana" }).click();
  await page.getByRole("button", { name: "Seguir mi pedido" }).click();
  await page.getByLabel("Código privado de seguimiento").fill(token);
  await page.getByRole("button", { name: "Consultar pedido" }).click();
  await expect(
    page.getByRole("dialog").getByText("Pendiente", { exact: true }),
  ).toBeVisible();
});

test("admin login, dashboard and inventory workflow", async ({ page }) => {
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: /Bienvenida,/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Administración" })
    .getByRole("button", { name: "Inventario", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Harina", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ingrediente", { exact: true }).selectOption("1");
  await page.getByLabel("Cantidad de ajuste").fill("3");
  await page.getByLabel("Motivo del ajuste").fill("Apertura de prueba");
  await page.getByRole("button", { name: "Registrar ajuste" }).click();
  await expect(
    page.getByRole("cell", { name: "33.000", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Administración" })
    .getByRole("button", { name: "Pedidos", exact: true })
    .click();
  await page.getByRole("button", { name: "Ver", exact: true }).first().click();
  await page.getByRole("button", { name: "Confirmado", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Confirmado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver", exact: true }).first().click();
  await page
    .getByRole("button", { name: "En producción", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Administración" })
    .getByRole("button", { name: "Inventario", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "31.000", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bienvenida de nuevo" }),
  ).toBeVisible();
});

test("mobile layout does not overflow and menu opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Torta de Chocolate", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  const widths = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.width);
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
});

test("custom quote reaches administration and converts with approved price", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("#inicio")
    .getByRole("button", { name: "Personaliza tu torta", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu nombre", { exact: true }).fill("Cotización E2E");
  await dialog.getByLabel("Teléfono de contacto").fill("999999999");
  await dialog.getByLabel("Temática o celebración").fill("Flores rosas");
  await dialog
    .getByLabel("Fecha solicitada")
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await dialog
    .getByRole("button", { name: "Solicitar cotización", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: /Solicitud #/ }),
  ).toBeVisible();
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: /Bienvenida,/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Administración" })
    .getByRole("button", { name: "Cotizaciones", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Flores rosas", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Estado", { exact: true }).selectOption("quoted");
  await page.getByLabel("Precio cotizado S/").fill("180");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Cotizado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver", exact: true }).click();
  await page.getByLabel("Producto base para cotización").selectOption("1");
  await page
    .getByRole("button", { name: "Crear pedido con precio cotizado" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Pedido #\d+ creado/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("code")).not.toBeEmpty();
});
