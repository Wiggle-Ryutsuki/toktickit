import { test, expect } from "@playwright/test";

test.describe("Feature-9: Authentication & Password Change E2E", () => {
  test.beforeEach(async ({ request }) => {
    // Reset firstlogin.requester account state to pristine before running tests
    // so tests are idempotent
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-01: Complete standard login, header verification, and logout lifecycle", async ({ page }) => {
    // 1. Navigate to root
    await page.goto("/");

    // 2. Unauthenticated user sees login form
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("password-input")).toBeVisible();
    await expect(page.getByTestId("login-submit-btn")).toBeVisible();

    // 3. Enter valid credentials for Jennifer Anderson
    await page.getByTestId("email-input").fill("jennifer.anderson@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // 4. Verify user enters application shell
    await expect(page.getByTestId("user-display-name")).toHaveText("Jennifer Anderson");
    await expect(page.getByTestId("user-role-badge")).toHaveText("Requester");
    await expect(page.getByTestId("logout-btn")).toBeVisible();

    // Verify decommissioned Development Requester selector is absent
    await expect(page.locator('[data-testid="change-requester-btn"]')).not.toBeVisible();

    // 5. Click Logout
    await page.getByTestId("logout-btn").click();

    // 6. Verify redirected back to Login screen
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("user-display-name")).not.toBeVisible();
  });

  test("E2E-02: Mandatory first-login password change intercept workflow", async ({ page, request }) => {
    // 1. Reset account mustChangePassword flag and password in database
    // via direct seed password
    await page.goto("/");

    // Clear any active session
    await page.context().clearCookies();
    await page.reload();

    // 2. Login with initial password
    await page.getByTestId("email-input").fill("firstlogin.requester@kmutt.ac.th");
    await page.getByTestId("password-input").fill("InitialPass123!");
    await page.getByTestId("login-submit-btn").click();

    // 3. Verify user is intercepted by the Change Password screen
    await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
    await expect(page.getByTestId("current-password-input")).toBeVisible();
    await expect(page.getByTestId("new-password-input")).toBeVisible();
    await expect(page.getByTestId("confirm-password-input")).toBeVisible();

    // Submit button should be initially disabled
    await expect(page.getByTestId("change-password-submit-btn")).toBeDisabled();

    // 4. Fill in new password meeting complexity
    await page.getByTestId("current-password-input").fill("InitialPass123!");
    await page.getByTestId("new-password-input").fill("NewSecurePassword456#");
    await page.getByTestId("confirm-password-input").fill("NewSecurePassword456#");

    // All checklist items should show checkmarks
    await expect(page.getByTestId("rule-length")).toContainText("✓");
    await expect(page.getByTestId("rule-cases")).toContainText("✓");
    await expect(page.getByTestId("rule-special")).toContainText("✓");
    await expect(page.getByTestId("rule-match")).toContainText("✓");

    // Submit button is now enabled
    await expect(page.getByTestId("change-password-submit-btn")).toBeEnabled();

    // 5. Submit new password
    await page.getByTestId("change-password-submit-btn").click();

    // 6. Verify user is admitted into normal application shell
    await expect(page.getByTestId("user-display-name")).toHaveText("FirstLogin Requester");
    await expect(page.getByTestId("user-role-badge")).toHaveText("Requester");
  });
});
