import { test, expect } from "@playwright/test";

test.describe("Feature-16: Role-Based Operational Dashboards (E2E-04)", () => {
  test.beforeEach(async ({ request, page }) => {
    // Clear cookies & logout
    await page.context().clearCookies();
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-04: IT Staff and Requester operational dashboard triage and drill-down flow (AC-02, AC-11, AC-12)", async ({
    page,
  }) => {
    // ----------------------------------------------------
    // PART 1: IT Staff Dashboard & Queue Drill-Down Flow
    // ----------------------------------------------------
    await page.goto("http://localhost:5173/");

    // 1. Log in as IT Staff (Somchai IT)
    await expect(page.getByTestId("email-input")).toBeVisible();
    await page.getByTestId("email-input").fill("staff.somchai@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // 2. Click "Dashboard" link in top navigation
    const navDashboardLink = page.getByTestId("nav-dashboard-link").first();
    await expect(navDashboardLink).toBeVisible();
    await navDashboardLink.click();

    // 3. Verify Staff Dashboard renders with welcome banner & 5 operational metric cards
    await expect(page.getByTestId("staff-dashboard-welcome")).toBeVisible();
    await expect(page.getByTestId("staff-dashboard-welcome")).toContainText("Somchai");

    await expect(page.getByTestId("metric-card-new")).toBeVisible();
    await expect(page.getByTestId("metric-card-open")).toBeVisible();
    await expect(page.getByTestId("metric-card-in-progress")).toBeVisible();
    await expect(page.getByTestId("metric-card-waiting")).toBeVisible();
    await expect(page.getByTestId("metric-card-my-assigned")).toBeVisible();

    // 4. Verify quick actions are present
    await expect(page.getByTestId("quick-action-create")).toBeVisible();
    await expect(page.getByTestId("quick-action-search")).toBeVisible();
    await expect(page.getByTestId("quick-action-my-queue")).toBeVisible();

    // 5. Click "New" metric card to drill down to new ticket queue (AC-12)
    await page.getByTestId("metric-card-new").click();

    // 6. Verify navigation to /queue with status=NEW
    await expect(page).toHaveURL(/status=NEW/);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await expect(page.getByTestId("status-filter")).toHaveValue("NEW");

    // 7. Log out IT Staff
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("email-input")).toBeVisible();

    // ----------------------------------------------------
    // PART 2: Requester Dashboard Flow
    // ----------------------------------------------------
    // 8. Log in as Requester (Jennifer Anderson)
    await page.getByTestId("email-input").fill("jennifer.anderson@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // 9. Navigate to Dashboard via Navbar
    const requesterDashboardLink = page.getByTestId("nav-dashboard-link").first();
    await expect(requesterDashboardLink).toBeVisible();
    await requesterDashboardLink.click();

    // 10. Verify Requester Dashboard renders with welcome banner & 4 metric cards (AC-02)
    await expect(page.getByTestId("requester-dashboard-welcome")).toBeVisible();
    await expect(page.getByTestId("requester-dashboard-welcome")).toContainText("Jennifer Anderson");

    await expect(page.getByTestId("metric-card-my-open")).toBeVisible();
    await expect(page.getByTestId("metric-card-in-progress")).toBeVisible();
    await expect(page.getByTestId("metric-card-resolved")).toBeVisible();
    await expect(page.getByTestId("metric-card-closed")).toBeVisible();

    // 11. Verify quick actions are present
    await expect(page.getByTestId("requester-quick-action-create")).toBeVisible();
    await expect(page.getByTestId("requester-quick-action-my-tickets")).toBeVisible();

    // 12. Click drill-down on In Progress card to view filtered tickets
    await page.getByTestId("drill-down-link-in-progress").click();
    await expect(page).toHaveURL(/status=IN_PROGRESS/);
    await expect(page.getByTestId("status-filter")).toHaveValue("IN_PROGRESS");

    // 13. Return to Dashboard and test My Open Tickets drill-down
    await requesterDashboardLink.click();
    await expect(page.getByTestId("drill-down-link-my-open")).toBeVisible();
    await page.getByTestId("drill-down-link-my-open").click();
    await expect(page).toHaveURL(/status=OPEN/);
    await expect(page.getByTestId("status-filter")).toHaveValue("OPEN");

    // 14. Return to Dashboard and test Resolved drill-down
    await requesterDashboardLink.click();
    await expect(page.getByTestId("drill-down-link-resolved")).toBeVisible();
    await page.getByTestId("drill-down-link-resolved").click();
    await expect(page).toHaveURL(/status=RESOLVED/);
    await expect(page.getByTestId("status-filter")).toHaveValue("RESOLVED");

    // 15. Return to Dashboard and test Closed drill-down
    await requesterDashboardLink.click();
    await expect(page.getByTestId("drill-down-link-closed")).toBeVisible();
    await page.getByTestId("drill-down-link-closed").click();
    await expect(page).toHaveURL(/status=CLOSED/);
    await expect(page.getByTestId("status-filter")).toHaveValue("CLOSED");
  });
});
