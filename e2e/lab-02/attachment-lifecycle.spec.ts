import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

test.describe("E2E-02: Attachment Lifecycle Flow", () => {
  const screenshotsDir = path.resolve("artifacts/lab-02/screenshots/ticket-detail");
  const tempFilesDir = path.resolve("artifacts/temp-e2e-files");

  test.beforeAll(async () => {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    fs.mkdirSync(tempFilesDir, { recursive: true });

    // Create sample files for upload testing
    fs.writeFileSync(
      path.join(tempFilesDir, "initial_report.pdf"),
      "%PDF-1.4 sample diagnostic report for e2e testing"
    );
    fs.writeFileSync(
      path.join(tempFilesDir, "dock_photo.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // Minimal PNG magic bytes
    );
  });

  test.afterAll(async () => {
    try {
      fs.rmSync(tempFilesDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("upload on create, inspect on detail, upload additional, and soft-remove with reason", async ({
    page,
  }) => {
    // 1. Visit root page and select Jennifer Anderson if modal appears
    await page.goto("/");

    const modalTitle = page.locator("#requester-modal-title");
    if (await modalTitle.isVisible()) {
      const select = page.locator("#requester-select");
      await select.waitFor({ state: "visible" });
      const opt = select.locator('option:has-text("Jennifer Anderson")');
      const val = await opt.getAttribute("value");
      await select.selectOption(val || "1");
      await page.click('button[type="submit"]:has-text("Continue")');
    }

    // 2. Create ticket with initial attachment
    await page.locator('[data-testid="create-ticket-btn"]').first().click();
    await expect(page.locator("h1")).toContainText("Create IT Support Ticket");

    const categorySelect = page.locator("#categoryId");
    await categorySelect.selectOption({ index: 1 });
    const relatedSystemSelect = page.locator("#relatedSystemId");
    await relatedSystemSelect.selectOption({ index: 1 });
    await page.selectOption("#requestedPriority", "URGENT");

    const summary = `E2E Hardware Failure with Attachment ${Date.now()}`;
    await page.fill("#summary", summary);
    await page.fill(
      "#description",
      "Attached diagnostic report and photo of damaged docking port for urgent replacement."
    );

    // Attach initial file
    const fileInput = page.locator("#attachments");
    await fileInput.setInputFiles(path.join(tempFilesDir, "initial_report.pdf"));
    await expect(page.locator("body")).toContainText("initial_report.pdf");

    // Submit ticket
    await page.click('button[type="submit"]:has-text("Submit Ticket")');

    // 3. From Success Screen, click "View Ticket Details"
    const successBanner = page.locator(".zen-success-banner");
    await expect(successBanner).toBeVisible();
    await page.click('button:has-text("View Ticket Details")');

    // 4. Inspect Ticket Detail Screen
    await expect(page.locator("h4")).toContainText(summary);
    await expect(page.locator("body")).toContainText("initial_report.pdf");

    // Verify status & priority badges
    await expect(page.locator(".badge-status-new").first()).toBeVisible();
    await expect(page.locator(".badge-priority-urgent").first()).toBeVisible();

    // Screenshot 1: Read-only detail view
    await page.screenshot({
      path: path.join(screenshotsDir, "read-only-detail-view.png"),
      fullPage: true,
    });

    // 5. Upload second attachment on the detail screen
    const detailDropzoneInput = page.locator("#attachment-upload-input");
    await detailDropzoneInput.setInputFiles(path.join(tempFilesDir, "dock_photo.png"));

    // Verify both attachments now appear in the list with download buttons
    await expect(page.locator("body")).toContainText("dock_photo.png");
    await expect(page.locator("body")).toContainText("initial_report.pdf");

    // Screenshot 2: Active attachment download
    await page.screenshot({
      path: path.join(screenshotsDir, "active-attachment-download.png"),
      fullPage: true,
    });

    // 6. Soft-Remove the first attachment
    const removeBtn = page
      .locator('.list-group-item:has-text("initial_report.pdf")')
      .locator('button:has-text("Remove")');
    await removeBtn.click();

    // Verify Soft-Removal Modal appears
    const removalModal = page.locator("#soft-removal-modal-title");
    await expect(removalModal).toBeVisible();

    const confirmButton = page.locator('button[type="submit"]:has-text("Confirm Removal")');

    // Attempting submit without reason triggers client-side validation
    await confirmButton.click();
    await expect(page.locator(".invalid-feedback")).toBeVisible();

    // Enter valid removal reason (3-255 characters)
    const reasonInput = page.locator("#removal-reason");
    await reasonInput.fill("Duplicate diagnostic file attached by mistake.");

    // Screenshot 3: Soft-removal confirmation modal
    await page.screenshot({
      path: path.join(screenshotsDir, "soft-removal-confirmation-modal.png"),
    });

    // Confirm removal
    await confirmButton.click();

    // 7. Verify Tombstone Display
    await expect(removalModal).not.toBeVisible();

    // The attachment should now be displayed as removed tombstone with gray tone and reason
    await expect(page.locator("body")).toContainText("Duplicate diagnostic file attached by mistake.");
    await expect(page.locator("body")).toContainText("Removed");
    await expect(page.locator("body")).toContainText("Download Unavailable");

    // Screenshot 4: Soft-removed tombstone display
    await page.screenshot({
      path: path.join(screenshotsDir, "soft-removed-tombstone-display.png"),
      fullPage: true,
    });
  });
});
