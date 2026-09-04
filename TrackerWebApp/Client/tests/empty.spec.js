import { test, expect } from "@playwright/test";
import { login, api } from "./helpers";

test("empty workspace, password-only login, Russian and dark defaults", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("body")).toHaveClass(/dark-theme/);
  await expect(
    page.locator(".social-login-row, .auth-divider, [data-auth-provider]"),
  ).toHaveCount(0);
  await expect(page.locator("#loginForm button[type=submit]")).toHaveText(
    "Войти",
  );
  await page.evaluate(() => document.fonts.ready);
  await info.attach("login", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("#loginForm button[type=submit]")).toBeInViewport();
  await info.attach("login-mobile", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("body")).toHaveClass(/dark-theme/);
  await expect(
    page.locator(".nav-queue, .task-card, .kanban-board"),
  ).toHaveCount(0);
  expect((await api(page, "/users")).map((user) => user.id)).toEqual([
    "admin1",
  ]);
  expect(await api(page, "/queues")).toEqual([]);
  expect(await api(page, "/issues")).toEqual([]);
  expect(await api(page, "/activity")).toEqual([]);
  expect(await api(page, "/settings")).toEqual({
    theme: "dark",
    language: "ru",
  });
  await info.attach("empty-tracker", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
  await page.reload();
  await expect(page.locator("#loggedInUserProfile")).toContainText("Admin");
  await expect(page.locator(".task-card, .nav-queue")).toHaveCount(0);
  await api(page, "/settings", "PATCH", { theme: "light", language: "en" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).not.toHaveClass(/dark-theme/);
  await page.locator("#btnTopbarLogout").click();
  await expect(page.locator("#loginForm")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("body")).toHaveClass(/dark-theme/);
});
