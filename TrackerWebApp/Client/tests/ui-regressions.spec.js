import { test, expect } from "@playwright/test";
import { api, login } from "./helpers";

for (const width of [1440, 375]) {
  test(`login has one sign-in action and no mode switch at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator("#loginForm button[type=submit]")).toBeEnabled();
    await expect(
      page.locator(".auth-tabs, .auth-tab, #registerForm"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Войти", exact: true }),
    ).toHaveCount(1);
    await expect(page.getByLabel("Email или имя")).toBeVisible();
    await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
    await expect(page.locator(".auth-demo-hint")).toHaveText(
      "Логин и пароль выдаёт администратор.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect
      .poll(() =>
        page.locator(".auth-brand-icon").evaluate((icon) => ({
          width: icon.offsetWidth,
          height: icon.offsetHeight,
        })),
      )
      .toEqual({ width: 46, height: 46 });
    await info.attach("login", {
      body: await page.locator(".auth-card").screenshot(),
      contentType: "image/png",
    });
    await page.getByLabel("Email или имя").fill("admin@tracker.com");
    await page.keyboard.press("Tab");
    await expect(page.locator("#loginPassword")).toBeFocused();
    await page.keyboard.type("admin123");
    await page.keyboard.press("Tab");
    await expect(page.locator(".auth-submit")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#app-container")).toBeVisible();
  });
}

for (const [width, theme, language] of [
  [1440, "dark", "ru"],
  [769, "light", "en"],
]) {
  test(`sidebar can be expanded by mouse and keyboard at ${width}px ${theme}/${language}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page);
    await api(page, "/settings", "PATCH", { theme, language });
    await page.reload();
    const app = page.locator("#app");
    const toggle = page.locator("#sidebarToggle");
    const collapseLabel =
      language === "ru" ? "Свернуть боковую панель" : "Collapse sidebar";
    const expandLabel =
      language === "ru" ? "Развернуть боковую панель" : "Expand sidebar";
    await expect(toggle).toHaveAccessibleName(collapseLabel);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(app).toHaveClass(/sidebar-collapsed/);
    await expect(toggle).toHaveAccessibleName(expandLabel);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Visibility alone does not detect a button clipped by overflow: hidden.
    await expect
      .poll(() =>
        toggle.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          const sidebar = button.closest("aside").getBoundingClientRect();
          return (
            rect.width >= 44 &&
            rect.left >= sidebar.left &&
            rect.right <= sidebar.right
          );
        }),
      )
      .toBe(true);
    await info.attach("collapsed-sidebar", {
      body: await page.locator("#sidebar").screenshot(),
      contentType: "image/png",
    });
    await toggle.click();
    await expect(app).not.toHaveClass(/sidebar-collapsed/);
    await expect(page.locator(".logo-text")).toBeVisible();
    await expect(toggle).toHaveAccessibleName(collapseLabel);
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(app).not.toHaveClass(/sidebar-collapsed/);

    // A previously collapsed desktop panel must still open normally on mobile.
    await toggle.click();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator("#hamburgerBtn").click();
    await expect(app).toHaveClass(/sidebar-open/);
    await expect(app).not.toHaveClass(/sidebar-collapsed/);
    await expect(page.locator(".logo-text")).toBeVisible();
    await page.locator('[data-view="my-tasks"]').click();
    await expect(app).not.toHaveClass(/sidebar-open/);
    await page.setViewportSize({ width, height: 1000 });
    await expect(app).toHaveClass(/sidebar-collapsed/);
    await toggle.click();
    await expect(app).not.toHaveClass(/sidebar-collapsed/);
    await api(page, "/settings", "PATCH", { theme: "light", language: "en" });
  });
}
