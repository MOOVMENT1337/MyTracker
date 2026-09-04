import { test, expect } from "@playwright/test";
import { api, login } from "./helpers";

test("login errors, no registration, HttpOnly session, reload and logout", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.locator('[data-auth-mode="register"], #registerForm'),
  ).toHaveCount(0);
  await page.locator("#loginEmail").fill("admin@tracker.com");
  await page.locator("#loginPassword").fill("bad-password");
  await page.locator("#loginForm button[type=submit]").click();
  await expect(page.locator("#authError")).toContainText(/Неверный|Invalid/);
  await login(page);
  const cookies = await context.cookies();
  expect(
    cookies.find((cookie) => cookie.name === "tracker_session"),
  ).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  expect(
    await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    })),
  ).toEqual({ local: {}, session: {}, cookie: "" });
  await page.reload();
  await expect(page.locator("#loggedInUserProfile")).toContainText("Admin");
  await page.locator("#btnTopbarLogout").click();
  await expect(page.locator("#loginForm")).toBeVisible();
  expect((await page.request.get("/api/issues")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("administrator creates employee, edits name and role; employee signs in without admin controls", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.locator("#btnAdminPanelSidebar").click();
  await page.locator("#btnCreateUser").click();
  await page.locator("#newUser_displayName").fill("UI Employee");
  await page.locator("#newUser_email").fill("ui.employee@example.com");
  await page.locator("#newUser_password").fill("ui-password123");
  await page.locator("#btnSubmitUser").click();
  await expect(page.locator("#createUserModal")).toHaveCount(0);
  const row = page
    .locator("tr[data-user-id]")
    .filter({ hasText: "ui.employee@example.com" });
  await expect(row).toBeVisible();
  await expect(page.locator("#loggedInUserProfile")).toContainText("Admin");
  await row.locator(".admin-role-select").selectOption("Tester");
  await row.locator(".admin-save-role").click();
  await expect(row.locator(".admin-role-current")).toHaveText("Tester");
  await row.locator(".admin-edit-name").click();
  await page.locator("#editDisplayNameInput").fill("UI Tester");
  await page.locator("#btnSaveDisplayName").click();
  await expect(row).toContainText("UI Tester");
  const employeeContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
  });
  const employee = await employeeContext.newPage();
  await login(employee, "UI Tester", "ui-password123");
  await expect(
    employee.locator("#btnAdminPanelSidebar, .delete-queue-btn"),
  ).toHaveCount(0);
  expect(
    (
      await employee.request.post("/api/users", {
        headers: { "X-Tracker-Browser": "1" },
        data: {
          displayName: "Forbidden",
          email: "no@example.com",
          password: "password123",
        },
      })
    ).status(),
  ).toBe(403);
  await employeeContext.close();
});

test("queue and issue CRUD, comments, full-page view, filters, drag, activity and cascading deletion", async ({
  page,
}) => {
  await login(page);
  await page.locator("#btnAddQueueSidebar").click();
  await page.locator("#queueName").fill("Browser Tests");
  await expect(page.locator("#queueKey")).toHaveValue("BT");
  await page.locator("#queueKey").fill("UITEST");
  await page.locator('.color-swatch[data-color="#98C379"]').click();
  await page.locator("#btnSubmitQueue").click();
  const queueNav = page
    .locator(".nav-queue")
    .filter({ hasText: "Browser Tests" });
  await expect(queueNav).toBeVisible();
  await queueNav.click();
  await page.locator("#btnCreateIssue").click();
  await expect(page.locator("#createQueue")).not.toHaveValue("");
  await page.locator("#createSummary").fill("Browser issue");
  await page.locator("#createDescription").fill("Description from React");
  await page.locator("#createAssignee").selectOption("admin1");
  await page.locator("#btnSubmitCreate").click();
  await expect(page.locator("#createIssueModal")).toHaveCount(0);
  let card = page.locator(".task-card").filter({ hasText: "Browser issue" });
  await expect(card).toBeVisible();
  const issueId = await card.getAttribute("data-issue-id");
  await card.click();
  await page.locator("#summaryField").fill("Edited browser issue");
  await page
    .locator("#commentInput")
    .fill("First comment\nsecond line <script>literal</script>");
  await page.locator("#commentInput").press("Control+Enter");
  await expect(page.locator(".comment-text")).toContainText(
    "<script>literal</script>",
  );
  await page.locator(".comment-delete-btn").click();
  await expect(page.locator("#commentsCount")).toHaveText("0");
  await page.locator("#commentInput").fill("Persisted comment");
  await page.locator("#btnPostComment").click();
  await expect(page.locator("#commentsCount")).toHaveText("1");
  // Saving after own comments must use their new server version without losing the draft.
  await page.locator("#prioritySelect").selectOption("High");
  await page.locator("#btnSaveIssue").click();
  await expect(page.locator("#issueModal")).toHaveCount(0);
  expect(await api(page, `/issues/${issueId}`)).toMatchObject({
    summary: "Edited browser issue",
    priority: "High",
  });
  card = page.locator(`.task-card[data-issue-id="${issueId}"]`);
  await card.click();
  const popupEvent = page.waitForEvent("popup");
  await page.locator("#openFullTaskLink").click();
  const popup = await popupEvent;
  await expect(popup.locator("#taskPageSummary")).toHaveValue(
    "Edited browser issue",
  );
  await popup.locator("#taskPageDescription").fill("Saved from full page");
  await popup.locator("#taskPageSave").click();
  await expect(popup.locator(".toast.success")).toContainText("Issue saved");
  await popup.reload();
  await expect(popup.locator("#taskPageDescription")).toHaveValue(
    "Saved from full page",
  );
  await popup.close();
  await page.locator("#btnCloseModal").click();
  await expect(page.locator("#issueModal")).toHaveCount(0);
  await page.reload();
  await page.locator(".nav-queue").filter({ hasText: "Browser Tests" }).click();
  await expect(page.locator("#issueBoardContainer")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const target = page.locator('.kanban-column[data-status="In Progress"]');
  const from = await card.boundingBox(),
    to = await target.boundingBox();
  await page.mouse.move(from.x + 50, from.y + 50);
  await page.mouse.down();
  await page.mouse.move(to.x + 100, to.y + 150, { steps: 12 });
  await page.mouse.up();
  await expect(
    target.locator(`.task-card[data-issue-id="${issueId}"]`),
  ).toBeVisible();
  await page.locator("#searchInput").fill("no match");
  await expect(page.locator(".task-card")).toHaveCount(0);
  await page.locator("#searchClear").click();
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.locator("#statusFilterBtn").click();
  await page.locator('input[name=status][value="Done"]').check();
  await expect(page.locator(".task-card")).toHaveCount(0);
  await page.locator("#resetFilters").click();
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.locator('[data-view="my-tasks"]').click();
  await expect(
    page.locator(`.task-card[data-issue-id="${issueId}"]`),
  ).toBeVisible();
  await page.locator('[data-view="activity"]').click();
  await expect(page.locator(".activity-list")).toContainText("UITEST-1");
  await queueNav.locator(".delete-queue-btn").click();
  await page.locator("#confirmOk").click();
  await expect(queueNav).toHaveCount(0);
  expect((await page.request.get(`/api/issues/${issueId}`)).status()).toBe(404);
});

test("settings persist across reload and remain isolated by user", async ({
  page,
}) => {
  await login(page);
  await page.locator("#btnOpenSettings").click();
  await page.locator("input[name=themeSetting][value=dark]").click();
  await expect(page.locator("body")).toHaveClass(/dark-theme/);
  await page.locator("input[name=languageSetting][value=ru]").click();
  await expect(page.locator("#btnCreateIssue")).toContainText("Создать");
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/dark-theme/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.locator("#btnTopbarLogout").click();
  await login(page, "alice@example.com", "pass123");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).not.toHaveClass(/dark-theme/);
  await page.locator("#btnTopbarLogout").click();
  await login(page);
  await api(page, "/settings", "PATCH", { language: "en", theme: "light" });
});

test("server errors keep drafts; deleted deep links and revoked sessions are handled", async ({
  page,
  context,
}) => {
  await login(page);
  await page.locator(".task-card").first().click();
  await page.locator("#summaryField").fill("Unsaved draft stays");
  await page.route("**/api/issues/*", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "VERSION_CONFLICT" } }),
        })
      : route.continue(),
  );
  await page.locator("#btnSaveIssue").click();
  await expect(page.locator("#issueModal [role=alert]")).toContainText(
    "changed",
  );
  await expect(page.locator("#summaryField")).toHaveValue(
    "Unsaved draft stays",
  );
  await page.unroute("**/api/issues/*");
  await page.goto("/?taskId=missing-task");
  await expect(page.locator(".task-page-empty-card")).toContainText(
    "Task not found",
  );
  await page.goto("/");
  await api(page, "/auth/logout-all", "POST", {});
  await page.reload();
  await expect(page.locator("#loginForm")).toBeVisible();
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "tracker_session",
    ),
  ).toBe(false);
});

test("board fetches beyond 100 records and issue deletion persists", async ({
  page,
}) => {
  await login(page);
  const queue = await api(page, "/queues", "POST", {
    name: "Pagination check",
    key: "PAGE",
  });
  try {
    for (let start = 0; start < 103; start += 10) {
      await Promise.all(
        Array.from({ length: Math.min(10, 103 - start) }, (_, index) =>
          api(page, "/issues", "POST", {
            queueId: queue.id,
            summary: `Paged issue ${start + index}`,
            assigneeId: "admin1",
          }),
        ),
      );
    }
    await page.reload();
    await page.locator(`.nav-queue[data-queue-id="${queue.id}"]`).click();
    await expect(page.locator(".task-card")).toHaveCount(103);
    await expect(page.locator(".stat-total .stat-count")).toHaveText("103");
    const card = page.locator(".task-card").first(),
      id = await card.getAttribute("data-issue-id");
    await card.click();
    await page.locator("#btnDeleteIssue").click();
    await page.locator("#confirmOk").click();
    await expect(page.locator("#issueModal")).toHaveCount(0);
    await expect(page.locator(".task-card")).toHaveCount(102);
    expect((await page.request.get(`/api/issues/${id}`)).status()).toBe(404);
  } finally {
    await api(page, `/queues/${queue.id}`, "DELETE");
  }
});
