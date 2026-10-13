import { test, expect } from "@playwright/test";

test.describe("Feature-14: Actions Taken UI Full Lifecycle Flow (E2E-02)", () => {
  test.beforeEach(async ({ request, page }) => {
    // Clear cookies & logout
    await page.context().clearCookies();
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-02: IT Staff adds and edits action, verified as read-only by Requester (AC-01, AC-03, AC-04)", async ({
    page,
  }) => {
    // ----------------------------------------------------
    // STEP 1: IT Staff logs in
    // ----------------------------------------------------
    await page.goto("http://localhost:5173/");

    await expect(page.getByTestId("email-input")).toBeVisible();
    await page.getByTestId("email-input").fill("staff.somchai@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // Verify lands on Ticket Queue
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();

    // ----------------------------------------------------
    // STEP 2: Open first ticket in queue
    // ----------------------------------------------------
    const firstRow = page.locator("[data-testid^='queue-row-']").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // Verify IT Staff Ticket Detail view renders
    await expect(page.getByTestId("staff-ticket-detail-view")).toBeVisible();
    await expect(page.getByTestId("actions-taken-section")).toBeVisible();

    // ----------------------------------------------------
    // STEP 3: Click "+ Add Action Taken"
    // ----------------------------------------------------
    const addActionBtn = page.getByTestId("add-action-btn");
    await expect(addActionBtn).toBeVisible();
    await addActionBtn.click();

    // Modal dialog is open
    const modal = page.getByTestId("action-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("action-modal-title")).toHaveText("Add Action Taken");

    // Performed By is read-only matching logged in user (BR-03)
    const performedByInput = page.getByTestId("action-performed-by-input");
    await expect(performedByInput).toHaveValue("Somchai Prasert");
    await expect(performedByInput).toHaveAttribute("readonly");

    // ----------------------------------------------------
    // STEP 4: Fill form with follow-up validation test
    // ----------------------------------------------------
    const descText = `Diagnosed faulty switch port at rack B-${Date.now()}`;
    await page.getByTestId("action-description-input").fill(descText);
    await page.getByTestId("action-status-select").selectOption("IN_PROGRESS");

    // Check Follow-Up Required
    const followUpCheckbox = page.getByTestId("action-followup-checkbox");
    await followUpCheckbox.check();

    // Attempt submit with empty follow-up note (AC-06)
    await page.getByTestId("action-submit-btn").click();
    await expect(page.getByTestId("followup-note-error")).toBeVisible();

    // Fill valid follow-up note
    const followUpNote = "Inspect replaced transceiver within 48 hours.";
    await page.getByTestId("action-followup-note-input").fill(followUpNote);
    await page.getByTestId("action-attachment-notes-input").fill("switch-port-log.txt");

    // Submit Action
    await page.getByTestId("action-submit-btn").click();

    // ----------------------------------------------------
    // STEP 5: Verify new action appears immediately in table (AC-03)
    // ----------------------------------------------------
    await expect(modal).not.toBeVisible();
    const actionsTable = page.getByTestId("actions-table");
    await expect(actionsTable).toBeVisible();
    await expect(actionsTable).toContainText(descText);
    await expect(actionsTable).toContainText("In Progress");
    await expect(actionsTable).toContainText(followUpNote);

    // ----------------------------------------------------
    // STEP 6: Edit the newly added action
    // ----------------------------------------------------
    const actionRow = actionsTable.locator("tr", { hasText: descText });
    const editBtn = actionRow.getByRole("button", { name: /Edit/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Modal opens in Edit mode
    await expect(page.getByTestId("action-modal")).toBeVisible();
    await expect(page.getByTestId("action-modal-title")).toHaveText("Edit Action Taken");

    // Update status to COMPLETED and enter Result
    await page.getByTestId("action-status-select").selectOption("COMPLETED");
    const resultText = "Transceiver swapped with spare unit. Link stable.";
    await page.getByTestId("action-result-input").fill(resultText);

    await page.getByTestId("action-submit-btn").click();
    await expect(page.getByTestId("action-modal")).not.toBeVisible();

    // Verify row status updated to Completed
    await expect(actionRow).toContainText("Completed");
    await expect(actionRow).toContainText(resultText);

    // ----------------------------------------------------
    // STEP 7: Logout as Staff
    // ----------------------------------------------------
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("email-input")).toBeVisible();

    // Clear session cookies to ensure fresh Requester session
    await page.context().clearCookies();

    // ----------------------------------------------------
    // STEP 8: Log in as Requester
    // ----------------------------------------------------
    await page.goto("http://localhost:5173/");
    await expect(page.getByTestId("email-input")).toBeVisible();
    await page.getByTestId("email-input").fill("jennifer.anderson@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // If RequesterSelector modal is shown, continue with Jennifer Anderson
    const modalTitle = page.locator("#requester-modal-title");
    if (await modalTitle.isVisible()) {
      const select = page.locator("#requester-select");
      await select.waitFor({ state: "visible" });
      const opt = select.locator('option:has-text("Jennifer Anderson")');
      const val = await opt.getAttribute("value");
      await select.selectOption(val || "1");
      await page.click('button[type="submit"]:has-text("Continue")');
    }

    // Open first ticket in My Tickets table
    const ticketsTable = page.getByTestId("tickets-table");
    await expect(ticketsTable).toBeVisible();
    const myTicketRow = ticketsTable.locator("tbody tr").first();
    await expect(myTicketRow).toBeVisible();
    await myTicketRow.click();

    // Verify Actions Taken section renders in Requester view
    const reqActionsSection = page.getByTestId("actions-taken-section");
    await expect(reqActionsSection).toBeVisible();

    // Verify "+ Add Action Taken" button is completely absent from DOM (FR-42, AC-04, BR-13)
    await expect(page.getByTestId("add-action-btn")).toHaveCount(0);

    // Verify all Edit buttons are completely absent from DOM
    await expect(reqActionsSection.getByRole("button", { name: /Edit/i })).toHaveCount(0);
  });
});
