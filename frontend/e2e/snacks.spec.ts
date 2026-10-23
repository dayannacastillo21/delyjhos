import { test, expect } from "@playwright/test";

test("accepted snack quote creates an order with pack recipe and private tracking", async ({
  page,
}) => {
  const base = "http://127.0.0.1:8001/api/v1";
  const auth = await page.request.post(base + "/auth/login", {
    data: { email: "admin@example.com", password: "E2E-only-password-123" },
  });
  const headers = {
    Authorization: "Bearer " + (await auth.json()).access_token,
  };
  const productResponse = await page.request.post(base + "/admin/products", {
    headers,
    data: {
      name: "Paquete 25 de prueba",
      slug: "paquete-25-test",
      category_id: 1,
      description: "Receta de prueba para un paquete completo",
      price: "35.00",
      is_active: true,
      is_featured: false,
    },
  });
  expect(productResponse.ok()).toBe(true);
  const product = await productResponse.json();
  const recipe = await page.request.post(base + "/admin/recipes", {
    headers,
    data: {
      product_id: product.id,
      name: "Paquete de prueba",
      yield_quantity: "1",
      labor_cost: "1.00",
      overhead_cost: "0.00",
      instructions: "Prueba aislada",
      items: [{ ingredient_id: 1, quantity: "0.25" }],
    },
  });
  expect(recipe.ok()).toBe(true);
  const date = new Date(Date.now() + 259200000).toISOString().slice(0, 10);
  const quoteResponse = await page.request.post(base + "/snack-quotes", {
    data: {
      name: "Mesa para convertir E2E",
      phone: "999999999",
      celebration: "Reunión",
      due_date: date,
      guests: 15,
      comments: "Propuesta de prueba",
      request_key: crypto.randomUUID(),
      items: [{ presentation_id: 1, packs: 2 }],
    },
  });
  expect(quoteResponse.ok()).toBe(true);
  const quote = await quoteResponse.json();
  const accepted = await page.request.put(
    base + `/admin/snack-quotes/${quote.id}`,
    {
      headers,
      data: {
        status: "accepted",
        quoted_price: "100.00",
        staff_notes: "Aceptado por el cliente",
      },
    },
  );
  expect(accepted.ok()).toBe(true);
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page
    .getByRole("button", { name: "Mesas de bocaditos", exact: true })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "Mesa para convertir E2E" })
    .getByRole("button", { name: "Ver", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Producto para Empanaditas de carne, 25 unidades", {
      exact: true,
    })
    .selectOption(String(product.id));
  await dialog
    .getByLabel("Precio por paquete de Empanaditas de carne, 25 unidades", {
      exact: true,
    })
    .fill("50.00");
  await dialog.getByRole("checkbox").check();
  await page.screenshot({ path: "test-results/snack-conversion.png" });
  await dialog
    .getByRole("button", { name: "Crear pedido de bocaditos", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("creado");
  const token = await dialog.locator("code").innerText();
  const detail = await (
    await page.request.get(base + `/admin/snack-quotes/${quote.id}`, {
      headers,
    })
  ).json();
  const order = await (
    await page.request.get(base + `/admin/orders/${detail.order_id}`, {
      headers,
    })
  ).json();
  expect(order.items[0].quantity).toBe(2);
  expect(order.items[0].product_name).toContain("25 unidades");
  expect(Number(order.total)).toBe(100);
  const tracked = await page.request.post(base + "/tracking", {
    data: { token },
  });
  expect((await tracked.json()).status).toBe("pending");
});

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
  await catalog.evaluate((element) =>
    element.scrollIntoView({ block: "start", behavior: "instant" }),
  );
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
  await form
    .getByRole("button", { name: "Consultar esta propuesta", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Consultar propuesta", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Pendiente",
  );
  await page
    .getByRole("button", { name: "Cerrar seguimiento", exact: true })
    .click();
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
  await page
    .getByRole("row")
    .filter({ hasText: "Mesa E2E" })
    .getByRole("button", { name: "Ver", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Mini brownies");
  await expect(page.getByRole("dialog")).toContainText("Precio por revisar");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Cerrar/ })
    .click();
  await page.getByRole("button", { name: /Vista previa de bocaditos/ }).click();
  await expect(page.locator(".snack-card")).toHaveCount(31);
  await expect(
    page.getByRole("button", { name: "Solicitar cotización de mi mesa" }),
  ).toBeDisabled();
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
  await page
    .locator("#bocaditos")
    .evaluate((element) =>
      element.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  await page.screenshot({ path: "test-results/snacks-mobile.png" });
});

test("administration creates a package and public builder uses configured guidance and sharing", async ({
  page,
}) => {
  const base = "http://127.0.0.1:8001/api/v1";
  const auth = await page.request.post(base + "/auth/login", {
    data: { email: "admin@example.com", password: "E2E-only-password-123" },
  });
  const headers = {
    Authorization: "Bearer " + (await auth.json()).access_token,
  };
  const settings = await page.request.put(base + "/business/settings", {
    headers,
    data: {
      name: "DelyJhos",
      whatsapp_number: "51999999999",
      demo_catalog: true,
      snack_min_per_guest: "2.50",
      snack_max_per_guest: "4.00",
    },
  });
  expect(settings.ok()).toBe(true);
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page
    .getByRole("button", { name: "Paquetes de bocaditos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Nuevo registro", exact: true })
    .click();
  await page
    .getByLabel("Nombre del paquete", { exact: true })
    .fill("Mesa de prueba");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Paquete configurado para esta prueba");
  await page
    .getByLabel("Visible en la página pública", { exact: true })
    .check();
  await page.getByLabel("Artículo 1", { exact: true }).selectOption("1");
  await page.getByLabel("Cantidad 1", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "+ Añadir línea", exact: true })
    .click();
  await page.getByLabel("Artículo 2", { exact: true }).selectOption("4");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Mesa de prueba", exact: true }),
  ).toBeVisible();
  await page.goto("/#bocaditos");
  await page
    .getByRole("button", {
      name: "Añadir Mesa de prueba a mi mesa",
      exact: true,
    })
    .click();
  await expect(page.locator("#arma-tu-mesa")).toContainText(
    "75 unidades · 2 variedades",
  );
  await page
    .locator(".snack-quote-form")
    .getByLabel("Invitados", { exact: true })
    .fill("20");
  await expect(page.locator(".snack-quote-form")).toContainText(
    "entre 50 y 80 bocaditos",
  );
  const share = page.getByRole("link", {
    name: "Compartir mi mesa por WhatsApp",
    exact: true,
  });
  expect(
    decodeURIComponent((await share.getAttribute("href")) || ""),
  ).toContain("2 paquete(s) de 25 unidades: Empanaditas de carne");
});
