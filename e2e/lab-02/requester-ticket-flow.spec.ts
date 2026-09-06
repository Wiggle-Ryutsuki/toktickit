import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

test.describe("E2E-01: Complete Requester Ticketing Flow", () => {
  const screenshotsDir = path.resolve("artifacts/lab-02/screenshots");
  const createTicketDir = path.join(screenshotsDir, "create-ticket");
  const myTicketsDir = path.join(screenshotsDir, "my-tickets");

  test.beforeAll(async () => {
    fs.mkdirSync(createTicketDir, { recursive: true });
    fs.mkdirSync(myTicketsDir, { recursive: true });
  });

  test("select requester, create ticket, view in my tickets, search/filter, and verify cross-requester isolation", async ({
    page,
  }) => {
    // 1. Visit root page
    await page.goto("/");

    // If requester selector modal is shown, choose Jennifer Anderson
    const modalTitle = page.locator("#requester-modal-title");
    if (await modalTitle.isVisible()) {
      const select = page.locator("#requester-select");
      await select.waitFor({ state: "visible" });
      const opt = select.locator('option:has-text("Jennifer Anderson")');
      const val = await opt.getAttribute("value");
      await select.selectOption(val || "1");
      await page.click('button[type="submit"]:has-text("Continue")');
    }

    // Ensure we are in the main shell with Jennifer Anderson selected
    await expect(page.locator(".zen-user-badge")).toContainText("Jennifer Anderson");

    // 2. Navigate to Create Ticket
    await page.locator('[data-testid="create-ticket-btn"]').first().click();
    await expect(page.locator("h1")).toContainText("Create IT Support Ticket");

    // Screenshot 1: Desktop initial
    await page.screenshot({
      path: path.join(createTicketDir, "desktop-initial.png"),
      fullPage: true,
    });

    // Screenshot 2: Validation failure (attempt submit empty form)
    await page.click('button[type="submit"]:has-text("Submit Ticket")');
    await expect(page.locator(".zen-field-error").first()).toBeVisible();
    await page.screenshot({
      path: path.join(createTicketDir, "validation-failure.png"),
      fullPage: true,
    });

    // Verify read-only requester context is pre-populated
    const requesterInput = page.locator("#requester");
    await expect(requesterInput).toBeVisible();
    await expect(requesterInput).toHaveValue(/Jennifer Anderson/);

    // Verify Category and Related System dropdowns loaded options
    const categorySelect = page.locator("#categoryId");
    await expect(categorySelect.locator("option")).not.toHaveCount(1);
    await categorySelect.selectOption({ index: 1 });
    const relatedSystemSelect = page.locator("#relatedSystemId");
    await relatedSystemSelect.selectOption({ index: 1 });
    await page.selectOption("#requestedPriority", "HIGH");

    const testSummary = `E2E Laptop Display Flickering ${Date.now()}`;
    await page.fill("#summary", testSummary);
    await page.fill(
      "#description",
      "The external monitor flickers intermittently when connected via USB-C dock after the latest display driver update."
    );

    // Screenshot 3: Submitting busy state (delay POST request by 1200ms)
    await page.route("**/api/tickets", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 1200));
      }
      await route.continue();
    });

    const submitBtn = page.locator('button[type="submit"]:has-text("Submit Ticket")');
    await submitBtn.click();

    const busyBtn = page.locator('button:has-text("Submitting")');
    await expect(busyBtn).toBeVisible();
    await expect(page.locator(".spinner-border")).toBeVisible();
    await page.screenshot({
      path: path.join(createTicketDir, "submitting-busy-state.png"),
      fullPage: true,
    });

    // Screenshot 4: Success banner with ticket number
    const successBanner = page.locator(".zen-success-banner");
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    await page.unroute("**/api/tickets");

    const ticketNoEl = successBanner.locator("strong").first();
    const ticketNo = (await ticketNoEl.textContent())?.trim() || "";
    expect(ticketNo).toMatch(/^TKT-\d{4}-\d{5}$/);

    await page.screenshot({
      path: path.join(createTicketDir, "success-banner-ticket-number.png"),
      fullPage: true,
    });

    // Screenshot 5: API error recovery
    await page.click('button:has-text("Back to My Tickets")');
    await page.locator('[data-testid="create-ticket-btn"]').first().click();
    await expect(page.locator("h1")).toContainText("Create IT Support Ticket");

    await page.locator("#categoryId").selectOption({ index: 1 });
    await page.locator("#relatedSystemId").selectOption({ index: 1 });
    await page.selectOption("#requestedPriority", "URGENT");
    await page.fill("#summary", "Preserved Disaster Recovery Input");
    await page.fill(
      "#description",
      "This input must be strictly preserved when the backend returns a 500 error envelope."
    );

    await page.route("**/api/tickets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "INTERNAL_ERROR",
              message: "Database connection failed temporarily. Please try again.",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.click('button[type="submit"]:has-text("Submit Ticket")');
    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator("#summary")).toHaveValue("Preserved Disaster Recovery Input");

    await page.screenshot({
      path: path.join(createTicketDir, "api-error-recovery.png"),
      fullPage: true,
    });
    await page.unroute("**/api/tickets");

    // 5. Navigate to My Tickets
    await page.click('button:has-text("Cancel")');
    await expect(page.locator("h1")).toContainText("My Tickets");

    const ticketsTable = page.locator('[data-testid="tickets-table"]');
    await expect(ticketsTable).toBeVisible();
    await expect(ticketsTable).toContainText(ticketNo);
    await expect(ticketsTable).toContainText(testSummary);

    // Screenshot 6: Desktop table
    await page.screenshot({
      path: path.join(myTicketsDir, "desktop-table.png"),
      fullPage: true,
    });

    // Screenshot 7: Mobile cards (<768px viewport)
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".zen-ticket-card").first()).toBeVisible();
    await page.screenshot({
      path: path.join(myTicketsDir, "mobile-cards.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    // Screenshot 8: Search filter in action
    const searchInput = page.locator('input[aria-label="Search tickets"]');
    await searchInput.fill(ticketNo);
    await page.waitForTimeout(500);

    await expect(ticketsTable.locator("tbody tr")).toHaveCount(1);
    await expect(ticketsTable).toContainText(ticketNo);

    await page.screenshot({
      path: path.join(myTicketsDir, "search-filter-in-action.png"),
      fullPage: true,
    });

    // Screenshot 9: No-results state
    await searchInput.fill("XYZ_NONEXISTENT_TICKET_9999");
    await page.waitForTimeout(500);
    const noResultsState = page.locator('[data-testid="no-results-state"]');
    await expect(noResultsState).toBeVisible();

    await page.screenshot({
      path: path.join(myTicketsDir, "no-results-state.png"),
      fullPage: true,
    });

    // Clear search filter
    await page.click('button:has-text("Clear Filters")');
    await expect(ticketsTable).toBeVisible();

    // Screenshot 10: Empty state (mocked zero tickets)
    await page.route("**/api/tickets*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          requesterTotalTickets: 0,
        }),
      });
    });

    await page.reload();
    const emptyState = page.locator('[data-testid="empty-tickets-state"]');
    await expect(emptyState).toBeVisible();

    await page.screenshot({
      path: path.join(myTicketsDir, "empty-state.png"),
      fullPage: true,
    });
    await page.unroute("**/api/tickets*");

    // Screenshot 11: Requester switching isolation
    await page.goto("/");
    await page.click('[data-testid="change-requester-btn"]');

    await expect(page.locator("#requester-modal-title")).toBeVisible();
    const switchSelect = page.locator("#requester-select");
    const optMichael = switchSelect.locator('option:has-text("Michael Brown")');
    const valMichael = await optMichael.getAttribute("value");
    await switchSelect.selectOption(valMichael || "2");
    await page.click('button[type="submit"]:has-text("Continue")');

    await expect(page.locator(".zen-user-badge")).toContainText("Michael Brown");

    // Verify Jennifer's ticket is NOT visible for Michael Brown
    await expect(page.locator("body")).not.toContainText(ticketNo);
    await expect(page.locator("body")).not.toContainText(testSummary);

    await page.screenshot({
      path: path.join(myTicketsDir, "requester-switching-isolation.png"),
      fullPage: true,
    });

    // Switch back to Jennifer Anderson
    await page.click('[data-testid="change-requester-btn"]');
    const optJennifer = switchSelect.locator('option:has-text("Jennifer Anderson")');
    const valJennifer = await optJennifer.getAttribute("value");
    await switchSelect.selectOption(valJennifer || "1");
    await page.click('button[type="submit"]:has-text("Continue")');
  });
});
