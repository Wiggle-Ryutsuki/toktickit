import { test, expect } from "@playwright/test";

test.describe("Feature-15: Enforced Ticket Lifecycle & Resolution Gate Workflow (E2E-03)", () => {
  test.beforeEach(async ({ request, page }) => {
    await page.context().clearCookies();
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-03: Full Resolution Gate Enforcement Workflow (AC-07, AC-08, BR-06, BR-07, UI-15)", async ({
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

    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();

    // ----------------------------------------------------
    // STEP 2: Open ticket from queue
    // ----------------------------------------------------
    const firstRow = page.locator("[data-testid^='queue-row-']").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await expect(page.getByTestId("staff-ticket-detail-view")).toBeVisible();
    await expect(page.getByTestId("actions-taken-section")).toBeVisible();

    // ----------------------------------------------------
    // STEP 3: Add an open action taken (IN_PROGRESS) to guarantee incomplete action
    // ----------------------------------------------------
    const addActionBtn = page.getByTestId("add-action-btn");
    await expect(addActionBtn).toBeVisible();
    await addActionBtn.click();

    const actionModal = page.getByTestId("action-modal");
    await expect(actionModal).toBeVisible();

    const actionDesc = `E2E Diagnostic Task - ${Date.now()}`;
    await page.getByTestId("action-description-input").fill(actionDesc);
    await page.getByTestId("action-status-select").selectOption("IN_PROGRESS");
    await page.getByTestId("action-submit-btn").click();

    await expect(actionModal).not.toBeVisible();
    const actionsTable = page.getByTestId("actions-table");
    await expect(actionsTable).toBeVisible();
    await expect(actionsTable).toContainText(actionDesc);
    await expect(actionsTable).toContainText("In Progress");

    // ----------------------------------------------------
    // STEP 4: Attempt to transition ticket status to RESOLVED
    // ----------------------------------------------------
    const statusSelect = page.getByTestId("status-transition-select");
    await expect(statusSelect).toBeVisible();

    // Select RESOLVED
    await statusSelect.selectOption("RESOLVED");

    // Fill mandatory resolution summary (>= 10 chars)
    const resolutionInput = page.getByTestId("resolution-summary-input");
    await expect(resolutionInput).toBeVisible();
    await resolutionInput.fill("All repairs were attempted and hardware was recalibrated.");

    // Click Save Operations
    await page.getByTestId("save-operations-button").click();

    // ----------------------------------------------------
    // STEP 5: Verify Resolution Gate Warning Modal appears (UI-15, AC-07)
    // ----------------------------------------------------
    const gateModal = page.getByTestId("resolution-gate-modal");
    await expect(gateModal).toBeVisible();
    await expect(page.getByText("Action Required: Incomplete Actions Taken")).toBeVisible();
    await expect(page.getByTestId("resolution-gate-action-count")).toBeVisible();

    // ----------------------------------------------------
    // STEP 6: Click [Review Actions Taken]
    // ----------------------------------------------------
    const reviewBtn = page.getByTestId("resolution-gate-review-btn");
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Modal dismisses
    await expect(gateModal).not.toBeVisible();

    // Verify status select reset back to current ticket status (not RESOLVED)
    await expect(statusSelect).not.toHaveValue("RESOLVED");

    // ----------------------------------------------------
    // STEP 7: Mark the open action as COMPLETED
    // ----------------------------------------------------
    const openActionRow = actionsTable.locator("tr", { hasText: actionDesc });
    const editBtn = openActionRow.getByRole("button", { name: /Edit/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    await expect(page.getByTestId("action-modal")).toBeVisible();
    await page.getByTestId("action-status-select").selectOption("COMPLETED");
    await page.getByTestId("action-result-input").fill("Diagnostic tests fully completed. All hardware operational.");
    await page.getByTestId("action-submit-btn").click();

    await expect(page.getByTestId("action-modal")).not.toBeVisible();
    await expect(openActionRow).toContainText("Completed");

    // ----------------------------------------------------
    // STEP 8: Also ensure any other open actions in the table are terminal
    // ----------------------------------------------------
    // (If other preexisting rows are In Progress or Planned, complete them)
    const inProgressRows = actionsTable.locator("tr", { hasText: "In Progress" });
    const countInProgress = await inProgressRows.count();
    for (let i = 0; i < countInProgress; i++) {
      const row = inProgressRows.first();
      const rowEdit = row.getByRole("button", { name: /Edit/i });
      if (await rowEdit.isVisible()) {
        await rowEdit.click();
        await page.getByTestId("action-status-select").selectOption("COMPLETED");
        await page.getByTestId("action-result-input").fill("Finished pre-existing open action.");
        await page.getByTestId("action-submit-btn").click();
        await expect(page.getByTestId("action-modal")).not.toBeVisible();
      }
    }

    const plannedRows = actionsTable.locator("tr", { hasText: "Planned" });
    const countPlanned = await plannedRows.count();
    for (let i = 0; i < countPlanned; i++) {
      const row = plannedRows.first();
      const rowEdit = row.getByRole("button", { name: /Edit/i });
      if (await rowEdit.isVisible()) {
        await rowEdit.click();
        await page.getByTestId("action-status-select").selectOption("CANCELLED");
        await page.getByTestId("action-result-input").fill("Cancelled superseded planned task.");
        await page.getByTestId("action-submit-btn").click();
        await expect(page.getByTestId("action-modal")).not.toBeVisible();
      }
    }

    // ----------------------------------------------------
    // STEP 9: Retry transitioning to RESOLVED (AC-08)
    // ----------------------------------------------------
    await statusSelect.selectOption("RESOLVED");
    await expect(page.getByTestId("resolution-summary-input")).toBeVisible();
    await page.getByTestId("resolution-summary-input").fill("All actions taken have been completed. Issue confirmed fully resolved.");
    await page.getByTestId("save-operations-button").click();

    // ----------------------------------------------------
    // STEP 10: Verify successful resolution
    // ----------------------------------------------------
    // Gate modal should NOT appear
    await expect(page.getByTestId("resolution-gate-modal")).not.toBeVisible();

    // Status badge updates to RESOLVED
    await expect(page.getByTestId("ticket-status-badge")).toHaveText("RESOLVED");
  });
});
