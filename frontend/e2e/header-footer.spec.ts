import { test, expect } from "@playwright/test";

test("header and footer provide responsive navigation and keyboard access", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".site-header");
  const footer = page.locator(".store-footer");
  for (const width of [1440, 1280, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await header.scrollIntoViewIfNeeded();
    if (width <= 1150) {
      const toggle = page.getByRole("button", { name: "Abrir menú", exact: true });
      await toggle.click();
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
      await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Inicio", exact: true }).focus();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    }
    await page.screenshot({ path: `test-results/header-${width}.png` });
    await footer.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/footer-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole("button", { name: "Buscar productos", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar nuestras tortas" })).toBeFocused();
  await page.locator(".work-card").first().getByRole("button", { name: "Ver fotografías y ampliar →" }).focus();
  await page.getByRole("button", { name: "Buscar productos", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar nuestras tortas" })).toBeFocused();
  await footer.getByRole("navigation", { name: "Explorar DelyJhos" }).getByRole("link", { name: "Bocaditos dulces y salados" }).click();
  await expect(page).toHaveURL(/#\/bocaditos$/);
  await footer.getByRole("button", { name: "Seguir mi pedido", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
