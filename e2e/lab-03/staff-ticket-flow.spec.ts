import { test, expect } from "@playwright/test";

test.describe("Feature-10 & Feature-11: IT Staff Queue & Ticket Operations E2E", () => {
  test.beforeEach(async ({ request, page }) => {
    // Clear cookies & logout
    await page.context().clearCookies();
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-03: IT Staff Queue Triage & Ticket Operations Flow (AC-06, AC-07, AC-08)", async ({ page }) => {
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

    // 9. Open first available ticket in the queue
    const firstRow = page.locator("[data-testid^='queue-row-']").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // 10. Verify IT Staff 2-Column Ticket Detail view renders
    await expect(page.getByTestId("staff-ticket-detail-view")).toBeVisible();
    await expect(page.getByTestId("ticket-owner-select")).toBeVisible();
    await expect(page.getByTestId("it-priority-select")).toBeVisible();
    await expect(page.getByTestId("status-transition-select")).toBeVisible();

    // 11. If claim ticket button is visible, claim ownership
    const claimBtn = page.getByTestId("claim-ticket-button");
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.getByText(/Ticket claimed successfully/i)).toBeVisible();
    }

    // 12. Update IT Priority to HIGH
    await page.getByTestId("it-priority-select").selectOption("HIGH");
    await page.getByTestId("save-operations-button").click();
    await expect(page.getByText(/Ticket operations updated successfully/i)).toBeVisible();
    await expect(page.getByTestId("it-priority-badge")).toHaveText("IT Priority: HIGH");

    // 13. Switch to Internal Notes tab and post a confidential note
    await page.getByTestId("tab-notes").click();
    await expect(page.getByTestId("internal-notes-confidential-banner")).toBeVisible();

    const noteText = `E2E diagnostic verification note ${Date.now()}`;
    const noteInput = page.getByPlaceholder(/Record diagnostic findings/i);
    await noteInput.fill(noteText);
    await page.getByRole("button", { name: "Add Internal Note" }).click();
    await expect(page.locator("[data-testid='internal-note-item']").filter({ hasText: noteText })).toBeVisible();
  });

  test("E2E-04: Public comment vs internal note boundary flow (AC-04, AC-10)", async ({ page }) => {
    const timestamp = Date.now();
    const publicCommentText = `IT Staff public update message ${timestamp}`;
    const confidentialNoteText = `Strictly confidential diagnostic log ${timestamp}`;

    // 1. Log in as IT Staff
    await page.goto("/");
    await page.getByTestId("email-input").fill("staff.somchai@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();
    await expect(page.getByTestId("staff-queue-table")).toBeVisible();

    // 2. Open Jennifer's ticket in the queue
    await page.getByTestId("search-input").fill("Requester Note Guard");
    await page.getByTestId("search-input").press("Enter");
    const queueRow = page.locator("[data-testid^='queue-row-']").first();
    await expect(queueRow).toBeVisible();
    await queueRow.click();
    await expect(page.getByTestId("staff-ticket-detail-view")).toBeVisible();

    // 3. Post a Public Comment
    await page.getByTestId("tab-comments").click();
    const commentInput = page.getByPlaceholder(/Type a comment to communicate with the requester/i);
    await commentInput.fill(publicCommentText);
    await page.getByRole("button", { name: "Post Public Comment" }).click();
    await expect(page.getByText(publicCommentText)).toBeVisible();

    // 4. Post an Internal Note
    await page.getByTestId("tab-notes").click();
    const noteInput = page.getByPlaceholder(/Record diagnostic findings/i);
    await noteInput.fill(confidentialNoteText);
    await page.getByRole("button", { name: "Add Internal Note" }).click();
    await expect(page.getByText(confidentialNoteText)).toBeVisible();

    // 5. Log out as IT Staff
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByTestId("login-submit-btn")).toBeVisible();

    // 6. Log in as Requester (Jennifer)
    await page.getByTestId("email-input").fill("jennifer.anderson@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // 7. Verify Requester lands on My Tickets
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // 8. Open Jennifer's ticket
    const jenniferRow = page.locator("tbody tr").filter({ hasText: "Requester Note Guard" }).first();
    await expect(jenniferRow).toBeVisible();
    await jenniferRow.click();

    // 9. Verify Requester Ticket Detail view loads and public comment is present
    await expect(page.getByTestId("requester-comments-card")).toBeVisible();
    await expect(page.getByText(publicCommentText)).toBeVisible();

    // 10. STRICT SEGREGATION VERIFICATION:
    // Internal Notes tab and confidential note text MUST NEVER BE VISIBLE
    await expect(page.getByTestId("tab-notes")).not.toBeVisible();
    await expect(page.getByTestId("internal-notes-section")).not.toBeVisible();
    await expect(page.getByText(confidentialNoteText)).not.toBeVisible();
  });
});
