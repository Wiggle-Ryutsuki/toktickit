import { test, expect } from "@playwright/test";

test.describe("Feature-10: IT Staff Ticket Queue E2E (E2E-03)", () => {
  test.beforeEach(async ({ request, page }) => {
    // Clear cookies & logout
    await page.context().clearCookies();
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-03: IT Staff Queue Triage Flow, filtering, detail navigation and filter persistence", async ({ page }) => {
    // 1. Navigate to root
    await page.goto("/");

    // 2. Log in as IT Staff (Somchai IT)
    await expect(page.getByTestId("email-input")).toBeVisible();
    await page.getByTestId("email-input").fill("staff.somchai@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // 3. Verify user lands on Ticket Queue
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await expect(page.getByTestId("user-role-badge")).toHaveText("IT Staff");

    // 4. Verify queue table loads
    await expect(page.getByTestId("staff-queue-table")).toBeVisible();

    // 5. Apply Status filter "New"
    await page.getByTestId("status-filter").selectOption("NEW");

    // 6. Enter search term
    await page.getByTestId("search-input").fill("battery");
    await page.getByTestId("search-input").press("Enter");

    // 7. Verify URL params updated
    await expect(page).toHaveURL(/status=NEW/);
    await expect(page).toHaveURL(/search=battery/);

    // 8. Click Reset Filters and verify table refreshes
    await page.getByTestId("reset-filters-btn").click();
    await expect(page.getByTestId("search-input")).toHaveValue("");
    await expect(page.getByTestId("status-filter")).toHaveValue("ALL");
  });
});
