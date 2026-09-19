import { test, expect } from "@playwright/test";

test.describe("Feature-12: Administrator User Management E2E", () => {
  const timestamp = Date.now();
  const testUserName = `New IT Staff ${timestamp}`;
  const testUserEmail = `new.staff.${timestamp}@kmutt.ac.th`;
  const initialPass = "InitialPass123!";
  const newPermanentPass = "NewPermanentPass123!";

  test.beforeEach(async ({ request, page }) => {
    await page.context().clearCookies();
    await request.post("http://localhost:3000/api/v1/auth/logout").catch(() => {});
  });

  test("E2E-05: Administrator User Management Lifecycle Flow", async ({ page }) => {
    // 1. Log in as Administrator
    await page.goto("/");
    await expect(page.getByTestId("email-input")).toBeVisible();
    await page.getByTestId("email-input").fill("admin.toktickit@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    // 2. Verify admin header has Admin link
    await expect(page.getByTestId("user-display-name")).toHaveText("Admin TokTickIT");
    await expect(page.getByTestId("user-role-badge")).toHaveText("Administrator");

    // 3. Click Admin navigation link
    const adminLink = page.getByRole("link", { name: "Admin" });
    await expect(adminLink).toBeVisible();
    await adminLink.click();

    // 4. Verify User Management console loads
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByTestId("user-management-table")).toBeVisible();

    // 5. Click "+ Create User"
    await page.getByTestId("create-user-btn").click();
    await expect(page.getByTestId("create-user-modal")).toBeVisible();

    // 6. Fill in new user form
    await page.getByTestId("create-name-input").fill(testUserName);
    await page.getByTestId("create-email-input").fill(testUserEmail);
    await page.getByTestId("create-role-select").selectOption("IT_STAFF");
    await page.getByTestId("create-password-input").fill(initialPass);

    await page.getByTestId("submit-create-btn").click();

    // Modal closes
    await expect(page.getByTestId("create-user-modal")).not.toBeVisible();

    // Verify new user appears in table
    await page.getByTestId("search-user-input").fill(testUserEmail);
    const table = page.getByTestId("user-management-table");
    const userRow = table.locator("tr").filter({ hasText: testUserEmail });
    await expect(userRow.getByText(testUserName)).toBeVisible();
    await expect(userRow.getByText(testUserEmail)).toBeVisible();

    // 7. Log out
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("email-input")).toBeVisible();

    // 8. Log in as new user with initial password
    await page.context().clearCookies();
    await page.goto("/");
    await page.getByTestId("email-input").fill(testUserEmail);
    await page.getByTestId("password-input").fill(initialPass);
    await page.getByTestId("login-submit-btn").click();

    // 9. Verify intercepted by Change Password screen
    await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
    await page.getByTestId("current-password-input").fill(initialPass);
    await page.getByTestId("new-password-input").fill(newPermanentPass);
    await page.getByTestId("confirm-password-input").fill(newPermanentPass);
    await page.getByTestId("change-password-submit-btn").click();

    // 10. Verify redirected to IT Staff Queue
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await expect(page.getByTestId("user-role-badge")).toHaveText("IT Staff");

    // 11. Log out
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("email-input")).toBeVisible();

    // 12. Admin logs back in to deactivate the account
    await page.context().clearCookies();
    await page.goto("/");
    await page.getByTestId("email-input").fill("admin.toktickit@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    // Find new user row and edit
    await page.getByTestId("search-user-input").fill(testUserEmail);
    const adminTable = page.getByTestId("user-management-table");
    const targetRow = adminTable.locator("tr").filter({ hasText: testUserEmail });
    await expect(targetRow.getByText(testUserEmail)).toBeVisible();

    // Click Edit button for that user in table
    const editBtn = targetRow.getByRole("button", { name: /edit/i });
    await editBtn.click();

    await expect(page.getByTestId("edit-user-modal")).toBeVisible();
    await expect(page.getByTestId("toggle-status-btn")).toHaveText("Deactivate User");
    await page.getByTestId("toggle-status-btn").click();

    // Confirmation dialog appears
    await expect(page.getByTestId("deactivate-confirm-modal")).toBeVisible();
    await page.getByTestId("confirm-deactivate-btn").click();

    // Verify modal closes and status is Inactive
    await expect(page.getByTestId("deactivate-confirm-modal")).not.toBeVisible();
    await expect(page.getByTestId("edit-user-modal")).not.toBeVisible();

    // Verify Inactive badge in table
    await expect(targetRow.getByText("Inactive")).toBeVisible();

    // 13. Log out and attempt to log in with deactivated user
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("email-input")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/");
    await page.getByTestId("email-input").fill(testUserEmail);
    await page.getByTestId("password-input").fill(newPermanentPass);
    await page.getByTestId("login-submit-btn").click();

    // Login must fail with account inactive message
    await expect(page.getByText(/inactive/i)).toBeVisible();
    await expect(page.getByTestId("user-display-name")).not.toBeVisible();

    // 14. Log in as Requester and verify access to /admin/users is denied
    await page.getByTestId("email-input").fill("jennifer.anderson@kmutt.ac.th");
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("login-submit-btn").click();

    await expect(page.getByTestId("user-display-name")).toHaveText("Jennifer Anderson");
    // Admin link should NOT exist in header
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();

    // Direct navigation to /#/admin/users
    await page.goto("/#/admin/users");
    // Should show Access Denied or redirect away
    await expect(page.getByTestId("forbidden-state")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
  });
});
