import { expect } from "@playwright/test";
export async function login(
  page,
  identifier = "admin@tracker.com",
  password = "admin123",
) {
  await page.goto("/");
  await expect(page.locator("#loginForm button[type=submit]")).toBeEnabled();
  await page.locator("#loginEmail").fill(identifier);
  await page.locator("#loginPassword").fill(password);
  await page.locator("#loginForm button[type=submit]").click();
  await expect(page.locator("#app-container")).toBeVisible();
  await expect(page.locator("#issueBoardContainer")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
export async function api(page, path, method = "GET", body) {
  const response = await page.request.fetch(`/api${path}`, {
    method,
    headers: { "X-Tracker-Browser": "1" },
    ...(body !== undefined ? { data: body } : {}),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.status() === 204 ? null : (await response.json()).data;
}
