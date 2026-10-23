import { test, expect } from "@playwright/test";

test("second batch plays with its original dimensions", async ({ page }) => {
  await page.goto("/#nuestros-trabajos");
  const gallery = page.locator("#nuestros-trabajos");
  for (const [title, width, height] of [
    ["Torta de Sonic y Shadow", 480, 848],
    ["Torta de abejitas y flores", 464, 832],
    ["Torta de temática científica", 576, 1024],
  ] as const) {
    await gallery
      .getByRole("button", { name: `Ver video de ${title}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const video = dialog.locator("video");
    await video.evaluate((element: HTMLVideoElement) => element.play());
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeGreaterThan(0);
    expect(
      await video.evaluate((element: HTMLVideoElement) => [
        element.videoWidth,
        element.videoHeight,
      ]),
    ).toEqual([width, height]);
    await dialog
      .getByRole("button", { name: "Cerrar trabajo", exact: true })
      .click();
  }
});

test("real videos load on demand and inspiration persists in the quote", async ({
  page,
}) => {
  const videos: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/video.mp4")) videos.push(request.url());
  });
  await page.goto("/#nuestros-trabajos");
  const gallery = page.locator("#nuestros-trabajos");
  await expect(gallery.locator(".work-card")).toHaveCount(6);
  await expect(gallery.locator("video")).toHaveCount(0);
  expect(videos).toHaveLength(0);
  await gallery
    .getByRole("button", {
      name: "Ver video de Torta de fútbol en celeste y blanco",
      exact: true,
    })
    .click();
  const viewer = page.getByRole("dialog");
  const video = viewer.locator("video");
  await expect(video).toHaveAttribute("controls", "");
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/real-work-video.png" });
  await viewer
    .getByRole("button", { name: "Quiero una torta similar", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await expect(form).toContainText("Tu inspiración");
  await expect(
    form.getByLabel("Temática o celebración", { exact: true }),
  ).toHaveValue("Torta de fútbol en celeste y blanco");
  await form
    .getByLabel("Tu nombre", { exact: true })
    .fill("Inspiración real E2E");
  await form.getByLabel("Teléfono de contacto").fill("999999999");
  await form
    .getByLabel("Fecha solicitada")
    .fill(new Date(Date.now() + 172800000).toISOString().slice(0, 10));
  await form.getByLabel("Colores preferidos").fill("Celeste y blanco");
  await form
    .getByLabel("Nombre o mensaje para la torta")
    .fill("Feliz cumpleaños");
  await form
    .getByLabel("Comentarios adicionales")
    .fill("Quiero coordinar las porciones");
  await form
    .getByRole("button", { name: "Solicitar cotización", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText("recibida");
  await page.goto("/#/admin");
  await page.getByLabel("Correo", { exact: true }).fill("admin@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("E2E-only-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("button", { name: "Cotizaciones", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Inspiración real E2E" });
  await row.getByRole("button", { name: "Ver", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Celeste y blanco");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Ver video de referencia" }),
  ).toHaveAttribute("href", /work-03\/video.mp4$/);
});

test("real gallery and expanded photos fit mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#nuestros-trabajos");
  const gallery = page.locator("#nuestros-trabajos");
  await expect(gallery.locator(".work-card")).toHaveCount(6);
  await gallery.evaluate((element) =>
    element.scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page.screenshot({ path: "test-results/real-works-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await gallery
    .getByRole("button", { name: "Ver fotografías y ampliar →", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByAltText(/fotografía ampliada/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    ).toBe(true);
  }
});
