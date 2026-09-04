import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { readFile } from "node:fs/promises";
import { api, login } from "./helpers";

async function prepareReference(
  page,
  snapshot,
  theme = "light",
  language = "en",
) {
  await page.goto("/reference/");
  await page.evaluate(
    ({ snapshot, theme, language }) => {
      AppData._users = snapshot.users;
      AppData._queues = snapshot.queues;
      AppData._issues = snapshot.issues;
      AppData._activityLog = snapshot.activity;
      AppData.setCurrentUser("admin1");
      saveAuthSession(AppData.getCurrentUser());
      State.language = language;
      AppData.setTheme(theme);
      applyTheme(theme);
      showApp();
    },
    { snapshot, theme, language },
  );
}
async function compare(current, reference, name, info, selector) {
  for (const page of [current, reference]) {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.addStyleTag({
      content:
        "* { animation: none !important; transition: none !important; caret-color: transparent !important; } #toastContainer { visibility: hidden !important; }",
    });
  }
  const capture = (page) =>
    selector ? page.locator(selector).screenshot() : page.screenshot();
  const actual = await capture(current),
    expected = await capture(reference);
  await info.attach(`${name}-react`, {
    body: actual,
    contentType: "image/png",
  });
  await info.attach(`${name}-original`, {
    body: expected,
    contentType: "image/png",
  });
  const a = PNG.sync.read(actual),
    b = PNG.sync.read(expected);
  expect({ width: a.width, height: a.height }).toEqual({
    width: b.width,
    height: b.height,
  });
  const diff = new PNG({ width: a.width, height: a.height });
  const different = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.15,
  });
  await info.attach(`${name}-diff`, {
    body: PNG.sync.write(diff),
    contentType: "image/png",
  });
  await info.attach(`${name}-metrics`, {
    body: JSON.stringify({
      different,
      total: a.width * a.height,
      ratio: different / (a.width * a.height),
    }),
    contentType: "application/json",
  });
  expect(different / (a.width * a.height), name).toBeLessThan(0.005);
}

test("unchanged migration stylesheets are copied byte for byte", async () => {
  // Auth tabs and collapsed sidebar layout intentionally differ after UI fixes.
  for (const name of [
    "reset",
    "components",
    "modals",
    "drag-drop",
    "themes",
    "animations",
    "responsive",
  ]) {
    expect(
      await readFile(new URL(`../src/styles/${name}.css`, import.meta.url)),
    ).toEqual(
      await readFile(
        new URL(`../../../html+css+js/styles/${name}.css`, import.meta.url),
      ),
    );
  }
});

for (const [width, height, theme, language] of [
  [1440, 1000, "light", "en"],
  [1440, 1000, "dark", "ru"],
  [375, 812, "light", "en"],
  [768, 1024, "dark", "ru"],
  [844, 390, "light", "en"],
]) {
  test(`original/React board parity ${width}x${height} ${theme} ${language}`, async ({
    page,
    context,
  }, info) => {
    await page.setViewportSize({ width, height });
    await login(page);
    await api(page, "/settings", "PATCH", { theme, language });
    await page.reload();
    await expect(page.locator("#issueBoardContainer")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    const snapshot = {
      users: await api(page, "/users?limit=100"),
      queues: await api(page, "/queues"),
      issues: await api(page, "/issues?limit=100"),
      activity: await api(page, "/activity"),
    };
    const reference = await context.newPage();
    await reference.setViewportSize({ width, height });
    await prepareReference(reference, snapshot, theme, language);
    await compare(page, reference, "board", info);
    await reference.close();
    await api(page, "/settings", "PATCH", { theme: "light", language: "en" });
  });
}

test("original/React issue modal, full task page, queue form and settings parity", async ({
  page,
  context,
}, info) => {
  await login(page);
  await api(page, "/settings", "PATCH", { theme: "light", language: "en" });
  await page.reload();
  const snapshot = {
    users: await api(page, "/users?limit=100"),
    queues: await api(page, "/queues"),
    issues: await api(page, "/issues?limit=100"),
    activity: await api(page, "/activity"),
  };
  const reference = await context.newPage();
  await prepareReference(reference, snapshot);
  const id = snapshot.issues[0].id;
  await page.locator(`.task-card[data-issue-id="${id}"]`).click();
  await reference.evaluate((id) => openModal(id), id);
  await reference.locator("#summaryField").focus();
  await page.locator("#summaryField").focus();
  await compare(page, reference, "issue-modal", info, ".issue-modal-panel");
  await page.locator("#btnCloseModal").click();
  await reference.locator("#btnCloseModal").click();
  await expect(page.locator("#issueModal")).toHaveCount(0);
  await page.locator("#btnAddQueueSidebar").click();
  await reference.locator("#btnAddQueueSidebar").click();
  await reference.locator("#queueName").focus();
  await page.locator("#queueName").focus();
  await compare(
    page,
    reference,
    "queue-form",
    info,
    "#createQueueModal .modal-panel",
  );
  await page.locator("#btnCloseQueueModal").click();
  await reference.locator("#btnCloseQueueModal").click();
  await expect(page.locator("#createQueueModal")).toHaveCount(0);
  await page.locator("#btnOpenSettings").click();
  await reference.locator("#btnOpenSettings").click();
  await page.locator("#btnCloseSettingsModal").focus();
  await reference.locator("#btnCloseSettingsModal").focus();
  await compare(page, reference, "settings", info, ".settings-modal-panel");
  await page.goto(`/?taskId=${id}`);
  await expect(page.locator("#taskPageSummary")).toBeVisible();
  await reference.goto(`/reference/?taskId=${id}`);
  await reference.evaluate((snapshot) => {
    AppData._users = snapshot.users;
    AppData._queues = snapshot.queues;
    AppData._issues = snapshot.issues;
    State.language = "en";
    showApp();
  }, snapshot);
  await compare(page, reference, "full-task", info);
  await reference.close();
});

test("mobile menu, modal keyboard close and reduced-motion interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  await page.locator("#hamburgerBtn").click();
  await expect(page.locator("#app")).toHaveClass(/sidebar-open/);
  await page.locator('[data-view="my-tasks"]').click();
  await expect(page.locator("#app")).not.toHaveClass(/sidebar-open/);
  await page.locator("#btnOpenSettings").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#settingsModal")).toHaveCount(0);
  // Horizontal board scrolling is part of the original responsive layout.
  expect(
    await page
      .locator("#issueBoardContainer")
      .evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
});
